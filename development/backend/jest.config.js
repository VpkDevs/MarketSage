module.exports = {
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
