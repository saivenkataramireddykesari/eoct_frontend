import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { SearchSuggestion } from '../shared-types';

interface SearchResultsProps {
  // Define any props if needed
}

const SearchResults: React.FC<SearchResultsProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('query');

    if (query) {
      setSearchQuery(query);
      setLoading(true);
      setError(null);
      searchAPI.getSuggestions(query)
        .then(response => {
          setResults(response.data.suggestions);
        })
        .catch(err => {
          console.error("Error fetching search results:", err);
          setError("Failed to fetch search results.");
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSearchQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [location.search]);

  const handleResultClick = (result: SearchSuggestion) => {
    switch (result.type) {
      case 'product':
        navigate(`/products/${result.id}`);
        break;
      case 'customer':
        navigate(`/customers/${result.id}`);
        break;
      case 'order':
        navigate(`/orders/${result.id}`);
        break;
      default:
        console.warn(`Unknown search result type: ${result.type}`);
        // Optionally navigate to a generic detail page or just do nothing
        break;
    }
  };

  return (
    <div className="search-results-page">
      <h2>Search Results for "{searchQuery}"</h2>
      {loading && <p>Loading results...</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && results.length === 0 && searchQuery && (
        <p>No results found for "{searchQuery}".</p>
      )}
      {!loading && !error && results.length > 0 && (
        <div className="results-list">
          {results.map((result, index) => (
            <div key={index} className="result-item" onClick={() => handleResultClick(result)}>
              <h3>{result.name}</h3>
              <p>Type: {result.type}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
