import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';
import { Signup } from './Signup';
import { useApp } from '@/store/app';

const renderAt = (el: React.ReactNode, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={el} />
        <Route path="/feed" element={<p>FEED</p>} />
        <Route path="/cadastro/perfil" element={<p>PASSO 2</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.useFakeTimers();
  useApp.getState().resetDemo();
});
afterEach(() => vi.useRealTimers());

describe('UC-10 Login', () => {
  it('shows the generic error for wrong credentials', () => {
    renderAt(<Login />, '/entrar');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lucas@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
  });

  it('shows the unverified-account state and resend', () => {
    renderAt(<Login />, '/entrar');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lucas.naoverificado@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Pista2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    act(() => vi.advanceTimersByTime(600));
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar e-mail de verificação' }));
    expect(screen.getByText(/E-mail reenviado/)).toBeInTheDocument();
  });

  it('signs in and goes to the Feed', () => {
    renderAt(<Login />, '/entrar');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lucas@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Pista2026!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('FEED')).toBeInTheDocument();
    expect(useApp.getState().signedIn).toBe(true);
  });
});

describe('UC-00 Cadastro', () => {
  it('summarises errors and reveals organizer fields', () => {
    renderAt(<Signup />, '/cadastro');
    fireEvent.click(screen.getByRole('radio', { name: /Piloto e Organizador/ }));
    expect(screen.getByLabelText('CPF ou CNPJ')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1)!);
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Revise 8 campos destacados.');
  });

  it('creates the account and advances to step 2', () => {
    renderAt(<Signup />, '/cadastro');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@gmail.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Pista2026!' } });
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nova Piloto' } });
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Curitiba, PR' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aceitar termos' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1)!);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('PASSO 2')).toBeInTheDocument();
    expect(useApp.getState().user.name).toBe('Nova Piloto');
    expect(useApp.getState().vehicles).toEqual([]);
  });
});
