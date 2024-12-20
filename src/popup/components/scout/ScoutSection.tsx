import React from 'react';
import styles from '../../styles/App.module.css';

interface ProductRecommendation {
  id: string;
  title: string;
  price: number;
  relevanceScore: number;
  platform: string;
}

interface ScoutData {
  recommendations: ProductRecommendation[];
  searchResults: ProductRecommendation[];
  loading: boolean;
}

const initialScoutData: ScoutData = {
  recommendations: [],
  searchResults: [],
  loading: true
};

export const ScoutSection: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [scoutData, setScoutData] = React.useState<ScoutData>(initialScoutData);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (isActive) {
      // TODO: Fetch recommendations from background service
      setTimeout(() => {
        setScoutData({
          recommendations: [
            {
              id: '1',
              title: 'Wireless Earbuds',
              price: 25.99,
              relevanceScore: 92,
              platform: 'AliExpress'
            },
            {
              id: '2',
              title: 'Smart Watch',
