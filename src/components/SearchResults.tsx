import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { FullSearchResultItem } from '../shared-types';

interface SearchResultsProps {
  // Define any props if needed
}

const SearchResults: React.FC<SearchResultsProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<FullSearchResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('query');
    console.log("Debug: Search query from URL params:", query);

    if (query) {
      setSearchQuery(query);
      setLoading(true);
      setError(null);
      searchAPI.fullSearch(query) // Use the new fullSearch API
        .then(response => {
          setResults(response.data.results); // Access .results from FullSearchResponse
          console.log("Debug: API success - full results:", response.data.results);
        })
        .catch(err => {
          console.error("Error fetching search results:", err);
          console.log("Debug: API error - results set to empty.");
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

  const handleResultClick = (result: FullSearchResultItem) => {
    // Use the link directly from the FullSearchResultItem
    navigate(result.link);
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
              {result.description && <p>{result.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
