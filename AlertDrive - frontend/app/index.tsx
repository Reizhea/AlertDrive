import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Region, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '@/components/SearchBar';
import { useRouter } from 'expo-router';
import { startBackgroundLocationTracking } from '@/hooks/backgroundLocationTask';
import axios from 'axios';

export default function HomeScreen() {
  const router = useRouter();
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<null | { latitude: number; longitude: number }>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [locationDetails, setLocationDetails] = useState({ address: '', distance: '', eta: '' });
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
  const mapRef = useRef<MapView>(null);
  const GOOGLE_API_KEY = 'YOUR-API-KEY';

  useEffect(() => {
    startBackgroundLocationTracking();
  }, []);
  
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    })();
  }, []);

  const handlePlaceSelect = async (latitude: number, longitude: number, description: string) => {
    setSelectedLocation({ latitude, longitude });
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    Keyboard.dismiss();

    try {
      const [distRes, directionsRes] = await Promise.all([
        axios.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${region?.latitude},${region?.longitude}&destinations=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
        ),
        axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${region?.latitude},${region?.longitude}&destination=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
        ),
      ]);

      const distance = distRes.data.rows[0].elements[0].distance.text;
      const duration = distRes.data.rows[0].elements[0].duration.text;
      const routePath = decodePolyline(directionsRes.data.routes[0].overview_polyline.points);

      setLocationDetails({ address: description, distance, eta: duration });
      setRouteCoordinates(routePath);
      setModalVisible(true);
    } catch (err) {
      console.error('Error fetching distance info:', err);
    }
  };

  const handlePoiClick = async (event: { nativeEvent: { placeId: string; name: string; coordinate: { latitude: number; longitude: number } } }) => {
    const { name, coordinate } = event.nativeEvent;
    const englishName = name.replace(/[^\x00-\x7F]/g, '').trim();
    handlePlaceSelect(coordinate.latitude, coordinate.longitude, englishName);
  };

  const handleMapPress = async (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (isSearchBarFocused) return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    Keyboard.dismiss();

    try {
      const [geoRes, distRes, directionsRes] = await Promise.all([
        axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
        ),
        axios.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${region?.latitude},${region?.longitude}&destinations=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
        ),
        axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${region?.latitude},${region?.longitude}&destination=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
        ),
      ]);

      const address = geoRes.data.results[0]?.formatted_address || 'Selected Location';
      const distance = distRes.data.rows[0].elements[0].distance.text;
      const duration = distRes.data.rows[0].elements[0].duration.text;
      const routePath = decodePolyline(directionsRes.data.routes[0].overview_polyline.points);

      setLocationDetails({ address, distance, eta: duration });
      setRouteCoordinates(routePath);
      setModalVisible(true);
    } catch (err) {
      console.error('Error fetching distance info:', err);
    }
  };

  const handlePinPress = () => {
    if (selectedLocation) setModalVisible(true);
  };

  const decodePolyline = (t: string) => {
    let points: { latitude: number; longitude: number }[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < t.length) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setIsSearchBarFocused(false); }}>
      <View style={styles.container}>
        {region && (
          <View style={{ flex: 1 }} pointerEvents={isSearchBarFocused ? 'none' : 'auto'}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              showsUserLocation
              onPress={handleMapPress}
              onPoiClick={handlePoiClick}
            >
              {selectedLocation && (
                <>
                  <Marker coordinate={selectedLocation} pinColor="red" onPress={handlePinPress} />
                  {modalVisible && routeCoordinates.length > 0 && (
                    <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="#4f46e5" />
                  )}
                </>
              )}
            </MapView>
          </View>
        )}

        <View style={styles.topSearchBar}>
          <SearchBar
            onFocus={() => setIsSearchBarFocused(true)}
            onBlur={() => setIsSearchBarFocused(false)}
            onPlaceSelect={handlePlaceSelect}
          />
        </View>

        <Modal visible={modalVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButtonOutside} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>📍 {locationDetails.address}</Text>
              <View style={styles.modalRow}>
                <View>
                  <Text style={styles.modalInfo}>Distance: {locationDetails.distance}</Text>
                  <Text style={styles.modalInfo}>ETA: {locationDetails.eta}</Text>
                </View>
                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() =>
                    Linking.openURL(
                      `google.navigation:q=${selectedLocation?.latitude},${selectedLocation?.longitude}&mode=d`
                    )
                  }
                >
                  <Ionicons name="navigate" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  topSearchBar: {
    position: 'absolute',
    top: 0,
    width: '100%',
    backgroundColor: '#fff',
    elevation: 5,
    zIndex: 10,
  },
  bottomRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 30,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  modalOverlay: { flex: 1 },  
  closeButtonOutside: {
    position: 'absolute',
    top: 5,
    right: 7,
    zIndex: 15,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalInfo: { fontSize: 16, marginBottom: 8 },
  modalContent: {
    justifyContent: 'space-between',
    gap: 12,
  },
  navigateButton: {
    width: 50,
    height: 50,
    borderRadius: 12,   
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 70,
  },
  
    navigateButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  
});
