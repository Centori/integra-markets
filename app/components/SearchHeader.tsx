import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onClearSearch: () => void;
}

interface SearchSuggestion {
  text: string;
  category: 'commodity' | 'question' | 'news';
  icon: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  searchQuery,
  onClearSearch
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Predefined suggestions based on common commodity trading queries
  const defaultSuggestions: SearchSuggestion[] = [
    { text: "What's driving oil prices today?", category: 'question', icon: 'help' },
    { text: "Gold price forecast", category: 'commodity', icon: 'trending-up' },
    { text: "Natural gas storage report", category: 'news', icon: 'article' },
    { text: "How does inflation affect commodities?", category: 'question', icon: 'help' },
    { text: "Silver market analysis", category: 'commodity', icon: 'analytics' },
    { text: "OPEC production cuts impact", category: 'question', icon: 'help' },
    { text: "Copper demand forecast", category: 'commodity', icon: 'trending-up' },
    { text: "Agricultural commodity trends", category: 'news', icon: 'article' }
  ];

  useEffect(() => {
    if (isFocused && searchQuery.length === 0) {
      setSuggestions(defaultSuggestions);
    } else if (searchQuery.length > 2) {
      // Filter suggestions based on search query
      const filtered = defaultSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, isFocused]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    onSearch(suggestion.text);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onClearSearch();
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'commodity': return '#4ECCA3';
      case 'question': return '#30A5FF';
      case 'news': return '#fbbf24';
      default: return '#888';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'commodity': return 'Market';
      case 'question': return 'Analysis';
      case 'news': return 'News';
      default: return '';
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Logo and Brand */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>i</Text>
        </View>
        <Text style={styles.brandText}>Integra Markets</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          isFocused && styles.searchInputFocused
        ]}>
          <MaterialIcons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Ask anything about commodities and markets..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={onSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <MaterialIcons name="close" size={16} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Suggestions */}
        {isFocused && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <MaterialIcons 
                    name={suggestion.icon} 
                    size={16} 
                    color={getCategoryColor(suggestion.category)} 
                  />
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: `${getCategoryColor(suggestion.category)}20` }
                    ]}>
                      <Text style={[
                        styles.categoryText,
                        { color: getCategoryColor(suggestion.category) }
                      ]}>
                        {getCategoryLabel(suggestion.category)}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="north-west" size={14} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Profile/Settings */}
      <View style={styles.profileContainer}>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialIcons name="person" size={20} color="#888" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    minHeight: 60,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 160,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#4ECCA3',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: '700',
  },
  brandText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    maxWidth: 600,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 16,
    height: 44,
  },
  searchInputFocused: {
    borderColor: '#4ECCA3',
    backgroundColor: '#2a2a2a',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    marginTop: 4,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  suggestionContent: {
    flex: 1,
    gap: 4,
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '400',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 40,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
});

export default SearchHeader;
