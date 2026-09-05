// Docker 없이 로컬 개발용 PostgreSQL을 띄운다 (Windows 개발 환경 대응).
// 운영/CI에서는 docker-compose.yml의 postgres 서비스를 사용한다.
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = path.resolve(process.cwd(), ".pgdata");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "ledgermark",
    password: "ledgermark",
    port: 5432,
    persistent: true,
  });

  if (!existsSync(databaseDir)) {
    console.log("initialising postgres data directory...");
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase("ledgermark");
    console.log("created database 'ledgermark'");
  } catch {
    console.log("database 'ledgermark' already exists");
  }

  console.log("postgres ready on localhost:5432 (Ctrl+C to stop)");

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
