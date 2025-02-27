import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  FlatList,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

interface SearchBarProps {
  onFocus: () => void;
  onBlur: () => void;
  onPlaceSelect: (latitude: number, longitude: number, description: string) => void;
}

const GOOGLE_API_KEY = 'YOUR-API-KEY';

export default function SearchBar({ onFocus, onBlur, onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    setFocused(true);
    onFocus();
  };

  const handleBack = () => {
    setFocused(false);
    setQuery('');
    setSuggestions([]);
    onBlur();
    Keyboard.dismiss();
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_API_KEY}`
      );
      setSuggestions(res.data.predictions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSelectPlace = async (placeId: string, description: string) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
      );
      const location = res.data.result.geometry.location;
      Keyboard.dismiss();
      setQuery(description);
      setSuggestions([]);
      setFocused(false);
      onPlaceSelect(location.lat, location.lng, description);
    } catch (err) {
      console.error('Error fetching place details:', err);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={focused ? handleBack : handleFocus} style={styles.iconWrapper}>
        <Ionicons name={focused ? 'arrow-back' : 'search'} size={24} color="black" />
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Search here"
        placeholderTextColor="#888"
        value={query}
        onFocus={handleFocus}
        onBlur={() => {}}
        onChangeText={handleSearch}
        returnKeyType="search"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearIcon}>
          <Ionicons name="close-circle" size={22} color="#aaa" />
        </TouchableOpacity>
      )}
      {focused && suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          style={styles.suggestions}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectPlace(item.place_id, item.description)}
            >
              <Text>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 5,
    width: '100%',
    position: 'relative',
  },
  iconWrapper: {
    paddingRight: 8,
  },
  clearIcon: {
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#000',
  },
  suggestions: {
    backgroundColor: '#fff',
    maxHeight: 200,
    width: '100%',
    position: 'absolute',
    top: 50,
    left: 0,
    right: 50,
    zIndex: 999,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
});
