import { Routes, Route, Navigate } from 'react-router-dom';
import BoardApp from './pages/board/BoardApp';
import PdaApp from './pages/pda/PdaApp';
import AdminApp from './pages/admin/AdminApp';

function App() {
  return (
    <Routes>
      <Route path="/board" element={<BoardApp />} />
      <Route path="/pda" element={<PdaApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/" element={<Navigate to="/board" replace />} />
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}

export default App;
