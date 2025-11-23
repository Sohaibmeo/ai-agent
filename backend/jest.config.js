/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^(.*)\\.js$': '$1',
    '^typeorm$': '<rootDir>/tests/mocks/typeorm.ts',
    '^@nestjs/common$': '<rootDir>/tests/mocks/nestjs-common.ts',
    '^@nestjs/typeorm$': '<rootDir>/tests/mocks/nestjs-typeorm.ts',
    '^../database/entities$': '<rootDir>/tests/mocks/entities.ts',
  },
};
