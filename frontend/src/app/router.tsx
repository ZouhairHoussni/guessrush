import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { CreateRoomWizardPage } from "../features/create-room/CreateRoomWizardPage";
import { SharedDisplayPage } from "../features/display/SharedDisplayPage";
import { HomePage } from "../features/home/HomePage";
import { JoinCodePage } from "../features/join-room/JoinCodePage";
import { JoinNamePage } from "../features/join-room/JoinNamePage";
import { CardSubmissionPage } from "../features/lobby/CardSubmissionPage";
import { HostLobbyPage } from "../features/lobby/HostLobbyPage";
import { PlayerLobbyPage } from "../features/lobby/PlayerLobbyPage";
import { PlayPage } from "../features/play/PlayPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateRoomWizardPage />} />
        <Route path="/join" element={<JoinCodePage />} />
        <Route path="/join/:code" element={<JoinNamePage />} />
        <Route path="/room/:code/cards" element={<CardSubmissionPage />} />
        <Route path="/room/:code/host" element={<HostLobbyPage />} />
        <Route path="/room/:code/lobby" element={<PlayerLobbyPage />} />
        <Route path="/room/:code/play" element={<PlayPage />} />
        <Route path="/room/:code/results" element={<PlayPage />} />
        <Route path="/room/:code/display" element={<SharedDisplayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
