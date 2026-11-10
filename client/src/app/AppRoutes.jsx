import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth';
import { AppShell } from '@/layouts/AppShell';
import { PATHS } from '@/app/routes/paths';
import { publicRoutes } from '@/app/routes/publicRoutes';
import { workspaceRoutes } from '@/app/routes/workspaceRoutes';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes (landing, sso callbacks, sign-in, sign-up) */}
      {publicRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          Component={route.Component}
        />
      ))}

      {/* Protected workspace routes */}
      <Route
        path={PATHS.APP.ROOT}
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {workspaceRoutes.map((route, idx) =>
          route.index ? (
            <Route key="index" index Component={route.Component} />
          ) : (
            <Route
              key={route.path || idx}
              path={route.path}
              Component={route.Component}
            />
          )
        )}
        <Route path="*" element={<Navigate to={PATHS.APP.DASHBOARD} replace />} />
      </Route>

      {/* Catch-all redirect to root */}
      <Route path="*" element={<Navigate to={PATHS.ROOT} replace />} />
    </Routes>
  );
}

export default AppRoutes;

