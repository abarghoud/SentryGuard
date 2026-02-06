const { Config } = require('jest');
const { getJestProjectsAsync } = require('@nx/jest');

module.exports = async (): Promise<Config> => ({
  projects: await getJestProjectsAsync(),
});
