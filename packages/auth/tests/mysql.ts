import mysql, { Connection } from 'mysql';
import getConnection from './connection';

const executeQuery = async (
  connection: Connection,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> =>
  new Promise((resolve, reject) => {
    connection.query(query, values, (error: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const getQuery = async <T>(
  connection: Connection,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    connection.query(query, values, (error: unknown, results: T[]) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(results);
    });
  });

export const clear = async (): Promise<void> => {
  const connectionString = getConnection();

  if (connectionString.slice(0, 9) === 'sqlite://') {
    return;
  }

  const connection: Connection = mysql.createConnection(connectionString);

  const tables: Record<string, unknown>[] = await getQuery(connection, 'SHOW TABLES');
  const promises: Promise<void>[] = [];
  for (const tableRow of tables) {
    promises.push(executeQuery(connection, `DROP TABLE ${connection.escapeId(Object.values(tableRow)[0] as string)}`));
  }
  await Promise.all(promises);
  connection.end();
};
