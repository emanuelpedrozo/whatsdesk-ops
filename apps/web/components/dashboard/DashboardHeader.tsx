'use client';

import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useState } from 'react';

type DashboardHeaderProps = {
  userName: string;
  userRole: string;
};

export function DashboardHeader({ userName, userRole }: DashboardHeaderProps) {
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="ops-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Painel de Atendimento WhatsApp</h1>
            <p>Usuário: {userName} ({userRole})</p>
          </div>
          <Button variant="outline" onClick={() => setShowLogoutConfirm(true)}>
            Sair
          </Button>
        </div>
      </header>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirmar saída"
        message="Tem certeza que deseja sair do sistema?"
        confirmText="Sair"
        cancelText="Cancelar"
        variant="primary"
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
