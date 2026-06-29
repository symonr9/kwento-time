// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_swift_speed.sql';
import m0001 from './0001_melted_jean_grey.sql';
import m0002 from './0002_slow_ego.sql';
import m0003 from './0003_yielding_puck.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003
    }
  }
  