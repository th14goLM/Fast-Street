import type { Category, Vehicle } from '@/domain/types';
import type { VehicleFormValues } from './VehicleFormFields';

/** "Volkswagen" is shortened to "VW" in vehicle names, as in the designs. */
export const vehicleName = (marca: string, modelo: string) => `${marca.replace('Volkswagen', 'VW')} ${modelo}`.trim();

export function formToVehicle(v: VehicleFormValues): Omit<Vehicle, 'id' | 'main' | 'history'> {
  return {
    marca: v.marca,
    modelo: v.modelo.trim(),
    name: vehicleName(v.marca, v.modelo.trim()),
    year: v.ano,
    color: v.cor.trim() || '—',
    cat: v.cat as Category,
    motor: v.motor,
    pot: v.pot,
    torque: v.torque,
    peso: v.peso,
    trans: v.trans,
    mods: v.mods,
  };
}

export const vehicleToForm = (v: Vehicle): VehicleFormValues => ({
  marca: v.marca,
  modelo: v.modelo,
  ano: v.year,
  cor: v.color === '—' ? '' : v.color,
  cat: v.cat,
  motor: v.motor,
  pot: v.pot,
  torque: v.torque,
  peso: v.peso,
  trans: v.trans,
  mods: v.mods,
});
