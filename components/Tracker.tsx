'use client';
import { useEffect } from 'react';
import { initTracker } from '@/lib/tracker';

export default function Tracker() {
  useEffect(() => { initTracker(); }, []);
  return null;
}
