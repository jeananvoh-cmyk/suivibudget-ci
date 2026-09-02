import { describe, it, expect } from 'vitest';
import { formatFCFA, formatAmountInWords, formatCompactFCFA, getProjectEntityInfo, getStatusConfig } from '../formatters';

describe('Formatters Unit Tests', () => {
  it('formats FCFA amounts with space separators', () => {
    expect(formatFCFA(1000000)).toBe('1 000 000 FCFA');
    expect(formatFCFA(450000)).toBe('450 000 FCFA');
    expect(formatFCFA(0)).toBe('0 FCFA');
  });

  it('translates amounts into French words correctly', () => {
    expect(formatAmountInWords(100000000)).toMatch(/100\sMillions/);
    expect(formatAmountInWords(1500000000)).toMatch(/1,5\sMilliard/);
    expect(formatAmountInWords(2000000000)).toMatch(/2\sMilliards/);
    expect(formatAmountInWords(350000)).toMatch(/350\sMille/);
    expect(formatAmountInWords(0)).toBe('0 FCFA');
  });

  it('formats compact FCFA for badges', () => {
    expect(formatCompactFCFA(2000000000)).toBe('2,0 Milliards FCFA');
    expect(formatCompactFCFA(50000000)).toBe('50 Millions FCFA');
  });

  it('detects entity info and clean location without duplicates', () => {
    // Mairie
    const mairie = getProjectEntityInfo('Mairie de Korhogo', 'Poro');
    expect(mairie.entityType).toBe('MAIRIE');
    expect(mairie.entityName).toBe('Mairie de Korhogo');
    expect(mairie.locationLabel).toBe('Korhogo (Poro)');

    // Conseil Régional
    const reg = getProjectEntityInfo('Conseil Régional Cavally', 'Cavally');
    expect(reg.entityType).toBe('REGION');
    expect(reg.entityName).toBe('Conseil Régional Cavally');
    expect(reg.locationLabel).toBe('Région Cavally');

    // District
    const dist = getProjectEntityInfo('District Autonome Yamoussoukro', 'Yamoussoukro');
    expect(dist.entityType).toBe('DISTRICT');
    expect(dist.entityName).toBe('District Autonome Yamoussoukro');
  });

  it('returns valid status config', () => {
    const notStarted = getStatusConfig('NOT_STARTED');
    expect(notStarted.label).toBe('Voté au Budget');
    expect(notStarted.icon).toBe('️');

    const inProgress = getStatusConfig('IN_PROGRESS');
    expect(inProgress.label).toBe('En cours');

    const completed = getStatusConfig('COMPLETED');
    expect(completed.label).toBe('Terminé / Livré');
  });
});
