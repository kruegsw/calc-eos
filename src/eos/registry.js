import vanDerWaals from './van-der-waals.js';
import berthelot from './berthelot.js';
import dieterici from './dieterici.js';
import redlichKwong from './redlich-kwong.js';
import srk from './srk.js';
import pengRobinson from './peng-robinson.js';
import prsv from './prsv.js';
import virial from './virial.js';

// Ordered roughly by historical development
export const eosList = [
  vanDerWaals,
  berthelot,
  dieterici,
  redlichKwong,
  srk,
  pengRobinson,
  prsv,
  virial,
];

export function getEosById(id) {
  return eosList.find((e) => e.id === id);
}
