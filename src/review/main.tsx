import { createRoot } from 'react-dom/client';
import { ReviewWorkspace } from './ui/ReviewWorkspace';
import './ui/review.css';

// Separate entry point: no production App, dataStore, service worker or Supabase initialization.
const root = document.getElementById('review-root');
if (root) createRoot(root).render(<ReviewWorkspace />);
