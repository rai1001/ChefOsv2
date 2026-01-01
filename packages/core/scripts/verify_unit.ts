import { Unit, UnitType } from '../src/domain/value-objects/Unit';

function testUnitFrom(value: string) {
  const unit = Unit.from(value);
  console.log(
    `Input: "${value}" -> Output: ${unit.toString()} (${unit.type === UnitType.UNIT ? 'UNIT' : unit.type})`
  );
}

console.log('--- Testing Unit.from() ---');
testUnitFrom('ud');
testUnitFrom('kg');
testUnitFrom('5.86');
testUnitFrom('25');
testUnitFrom('invalid');
testUnitFrom('   Kg   ');
testUnitFrom('10.5');
console.log('---------------------------');
