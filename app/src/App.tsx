import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthedShell, PublicShell } from '@/layout/Shell';
import { Onboarding, Splash } from '@/features/auth/Welcome';
import { Login } from '@/features/auth/Login';
import { Signup } from '@/features/auth/Signup';
import { FirstVehicle, OptionalProfile, PermissionLocation, PermissionNotifications } from '@/features/auth/SignupSteps';
import { Feed } from '@/features/feed/Feed';
import { MapScreen } from '@/features/map/MapScreen';
import { EventDetail } from '@/features/events/EventDetail';
import { Registration } from '@/features/registration/Registration';
import { Garage, VehicleDetail, VehicleEditor } from '@/features/garage/Garage';
import { Ranking } from '@/features/ranking/Ranking';
import { Profile, ResultDetail, Settings } from '@/features/profile/Profile';
import { Notifications } from '@/features/notifications/Notifications';
import { useApp } from '@/store/app';

// Desktop-only areas are split into their own chunks.
const MyEvents = lazy(() => import('@/features/organizer/MyEvents').then((m) => ({ default: m.MyEvents })));
const EventWizard = lazy(() => import('@/features/organizer/EventWizard').then((m) => ({ default: m.EventWizard })));
const EventPublished = lazy(() => import('@/features/organizer/EventWizard').then((m) => ({ default: m.EventPublished })));
const EventWorkspace = lazy(() => import('@/features/organizer/EventWorkspace').then((m) => ({ default: m.EventWorkspace })));
const OrgRanking = lazy(() => import('@/features/organizer/OrgRanking').then((m) => ({ default: m.OrgRanking })));
const DesignSystem = lazy(() => import('@/features/design-system/DesignSystem').then((m) => ({ default: m.DesignSystem })));

function Home() {
  const signedIn = useApp((s) => s.signedIn);
  return <Navigate to={signedIn ? '/feed' : '/boas-vindas'} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<PublicShell />}>
            <Route path="/boas-vindas" element={<Splash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/cadastro" element={<Signup />} />
            <Route path="/cadastro/perfil" element={<OptionalProfile />} />
            <Route path="/cadastro/localizacao" element={<PermissionLocation />} />
            <Route path="/cadastro/notificacoes" element={<PermissionNotifications />} />
            <Route path="/cadastro/veiculo" element={<FirstVehicle />} />
          </Route>
          <Route element={<AuthedShell />}>
            <Route path="/feed" element={<Feed />} />
            <Route path="/mapa" element={<MapScreen />} />
            <Route path="/eventos/:id" element={<EventDetail />} />
            <Route path="/eventos/:id/inscricao" element={<Registration />} />
            <Route path="/garagem" element={<Garage />} />
            <Route path="/garagem/novo" element={<VehicleEditor key="novo" />} />
            <Route path="/garagem/:id" element={<VehicleDetail />} />
            <Route path="/garagem/:id/editar" element={<VehicleEditor key="editar" />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/perfil/resultados/:id" element={<ResultDetail />} />
            <Route path="/perfil/configuracoes" element={<Settings />} />
            <Route path="/notificacoes" element={<Notifications />} />
            <Route path="/organizador" element={<MyEvents />} />
            <Route path="/organizador/novo" element={<EventWizard />} />
            <Route path="/organizador/publicado" element={<EventPublished />} />
            <Route path="/organizador/eventos/:id/inscricoes" element={<EventWorkspace key="manage" view="manage" />} />
            <Route path="/organizador/eventos/:id/resultados" element={<EventWorkspace key="results" view="results" />} />
            <Route path="/organizador/eventos/:id/resultados/revisao" element={<EventWorkspace key="review" view="review" />} />
            <Route path="/organizador/ranking" element={<OrgRanking />} />
          </Route>
          <Route path="/design-system" element={<DesignSystem />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
