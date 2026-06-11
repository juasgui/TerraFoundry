import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ControlCenter from './views/ControlCenter';
import OntologyManager from './views/OntologyManager';
import ObjectExplorer from './views/ObjectExplorer';
import MapsView from './views/MapsView';
import AssetsView from './views/AssetsView';
import MissionsView from './views/MissionsView';
import PipelinesView from './views/PipelinesView';
import Workshop from './views/Workshop';
import AIAssistant from './views/AIAssistant';
import ReportsView from './views/ReportsView';
import { dashboardApi, missionsApi } from './api/foundryApi';
import { useAppStore } from './store/appStore';

function RootInit() {
  const { setMetrics, setAlerts, setMissions } = useAppStore();

  useEffect(() => {
    Promise.all([dashboardApi.metrics(), dashboardApi.alerts(), missionsApi.list()])
      .then(([m, a, ms]) => { setMetrics(m); setAlerts(a); setMissions(ms); })
      .catch(() => {});
  }, []);

  return null;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <RootInit />
        <Layout />
      </>
    ),
    children: [
      { index: true,           element: <ControlCenter /> },
      { path: 'ontology',      element: <OntologyManager /> },
      { path: 'objects',       element: <ObjectExplorer /> },
      { path: 'objects/:id',   element: <ObjectExplorer /> },
      { path: 'maps',          element: <MapsView /> },
      { path: 'assets',        element: <AssetsView /> },
      { path: 'missions',      element: <MissionsView /> },
      { path: 'pipelines',     element: <PipelinesView /> },
      { path: 'workshop',      element: <Workshop /> },
      { path: 'ai',            element: <AIAssistant /> },
      { path: 'reports',       element: <ReportsView /> },
      { path: '*',             element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
