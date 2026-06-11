import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ObjectDetailPanel from '../panels/ObjectDetailPanel';
import { useAppStore } from '../../store/appStore';

export default function Layout() {
  const { detailPanelOpen } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-foundry-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-hidden relative">
          <div className={`h-full transition-all duration-300 ${detailPanelOpen ? 'mr-[480px]' : ''}`}>
            <Outlet />
          </div>
          {detailPanelOpen && <ObjectDetailPanel />}
        </main>
      </div>
    </div>
  );
}
