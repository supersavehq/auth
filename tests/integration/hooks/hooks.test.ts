import express from 'express';
import { EntityDefinition, SuperSave } from 'supersave';
import supertest from 'supertest';
import { superSaveAuth, User } from '../../../build';
import { getUserRepository } from '../../../src/db';
import { hash } from '../../../src/auth';
import getConnection from '../../connection';

const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const PASSWORD = 'pass-word';
const PLANET_1 = 'Mars';
const PLANET_2 = 'Uranus';

type Planet = {
  id: string;
  name: string;
  distance?: number;
  userId: string;
};

export const planetEntity: EntityDefinition = {
  name: 'planet',
  template: {
    name: '',
  },
  relations: [],
};

type Moon = {
  id: string;
  name: string;
  userId: string;
  planet: Planet;
};

const moonEntity: EntityDefinition = {
  name: 'moon',
  template: {},
  relations: [
    {
      name: 'planet',
      field: 'planet',
      multiple: false,
    },
  ],
};

type System = {
  id: string;
  name: string;
  userId: string;
  planets: Planet[];
};

const systemEntity: EntityDefinition = {
  name: 'system',
  template: {},
  relations: [
    {
      name: 'planet',
      field: 'planets',
      multiple: true,
    },
  ],
};

let user1: User;
let user2: User;
let user1AccessToken: string;
let planetMars: Planet;

const app = express();
app.use(express.json());

const superTest = supertest(app);
// We initialize supersave manually here, because we do some more setup than in the boiler plate.
const superSavePromise = SuperSave.create(getConnection()).then(
  (superSave: SuperSave) => {
    return superSaveAuth(superSave, { tokenSecret: 'aaa' })
      .then(({ router, middleware, addCollection }) => {
        return Promise.all([
          addCollection(planetEntity),
          addCollection(moonEntity),
          addCollection(systemEntity),
        ]).then(() => {
          return { router, middleware };
        });
      })
      .then(({ router, middleware }) => {
        app.use('/auth', router);
        return superSave.getRouter().then((superSaveRouter) => {
          app.use('/api', middleware.authenticate, superSaveRouter);
        });
      })
      .then(() => {
        return hash.hash(PASSWORD);
      })
      .then((passwordHash: string) => {
        const userRepository = getUserRepository(superSave);
        return userRepository
          .create({
            // @ts-expect-error We are explicitly specifying the entity, which is not supported by types, but does work.
            id: USER_ID_1,
            email: 'user1@example.com',
            password: passwordHash,
          })
          .then((user) => {
            user1 = user;
            return userRepository.create({
              // @ts-expect-error We are explicitly specifying the entity, which is not supported by types, but does work.
              id: USER_ID_2,
              email: 'user2@example.com',
              password: passwordHash,
            });
          })
          .then((user) => {
            user2 = user;
          });
      })
      .then(() => {
        const planetRepository = superSave.getRepository<Planet>(
          planetEntity.name
        );
        return planetRepository
          .create({
            // @ts-expect-error We are explicitly specifying the entity, which is not supported by types, but does work.
            id: PLANET_1,
            name: PLANET_1,
            distance: PLANET_1.length,
            userId: user1.id,
          })
          .then((createdMars) => {
            planetMars = createdMars;
            return planetRepository.create({
              // @ts-expect-error We are explicitly specifying the entity, which is not supported by types, but does work.
              id: PLANET_2,
              name: PLANET_2,
              distance: PLANET_2.length,
              userId: user2.id,
            });
          });
      })
      .then(() => {
        const moonRepository = superSave.getRepository<Moon>('moon');
        return moonRepository.create({
          name: 'Phobos',
          planet: planetMars,
          userId: user1.id,
        });
      })
      .then(() => {
        const systemRepository = superSave.getRepository<System>('system');
        return systemRepository.create({
          name: 'Solar system',
          planets: [planetMars],
          userId: user1.id,
        });
      })
      .then(() => {
        return superTest
          .post('/auth/login')
          .send({ email: 'user1@example.com', password: PASSWORD })
          .expect(200);
      })
      .then((response) => {
        expect(response.body.data.authorized).toBe(true);
        user1AccessToken = response.body.data.accessToken;
      })
      .then(() => superSave);
  }
);

describe('get', () => {
  it('fetches only the row for the user', async () => {
    await superSavePromise;
    const response = await superTest
      .get('/api/planets')
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toEqual(PLANET_1);
    expect(response.body.data[0].userId).not.toBeDefined();
  });
});

describe('getById', () => {
  it('allows fetching the planet for the user', async () => {
    await superSavePromise;
    const response = await superTest
      .get(`/api/planets/${PLANET_1}`)
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data.name).toEqual(PLANET_1);
    expect(response.body.data.userId).not.toBeDefined();
  });

  it('bans fetching the planet for a different user', async () => {
    await superSavePromise;
    await superTest
      .get(`/api/planets/${PLANET_2}`)
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(401);
  });
});

describe('entityTransform', () => {
  test('the userId is removed from a singular related entity', async () => {
    await superSavePromise;
    const response = await superTest
      .get('/api/moons')
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);

    const moon = response.body.data[0] as Moon;
    expect(moon.planet.userId).not.toBeDefined();
  });

  test('the userId is removed from a multiple related entity', async () => {
    await superSavePromise;
    const response = await superTest
      .get('/api/systems')
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);

    const system = response.body.data[0] as System;
    expect(system.planets[0].userId).not.toBeDefined();
  });
});

describe('updateBefore', () => {
  it('allows updating the planet for the user', async () => {
    await superSavePromise;
    const response = await superTest
      .patch(`/api/planets/${PLANET_1}`)
      .send({ name: `${PLANET_1}-${PLANET_1}` })
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data.name).toEqual(`${PLANET_1}-${PLANET_1}`);
    expect(response.body.data.userId).not.toBeDefined();
  });

  it('bans providing a different userId in the update', async () => {
    await superSavePromise;
    await superTest
      .patch(`/api/planets/${PLANET_1}`)
      .send({ name: `${PLANET_1}-${PLANET_1}`, userId: USER_ID_2 })
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(401);
  });

  it('bans updating the planet for a different user', async () => {
    await superSavePromise;
    await superTest
      .patch(`/api/planets/${PLANET_2}`)
      .send({ name: `${PLANET_2}-${PLANET_2}` })
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(401);
  });
});

describe('createBefore', () => {
  it('allows creating the planet for the user', async () => {
    const superSave = await superSavePromise;
    const response = await superTest
      .post(`/api/planets`)
      .send({ name: 'new-planet' })
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data.name).toEqual('new-planet');
    expect(response.body.data.userId).not.toBeDefined();

    const planetRepository = superSave.getRepository<Planet>(planetEntity.name);
    const planet = await planetRepository.getById(response.body.data.id);
    expect(planet).toBeDefined();
    expect((planet as Planet).userId).toEqual(USER_ID_1);
  });

  it('prevents providing a different userId for the entity.', async () => {
    const superSave = await superSavePromise;
    const response = await superTest
      .post(`/api/planets`)
      .send({ name: 'another-planet', userId: USER_ID_2 })
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(200);

    expect(response.body.data.name).toEqual('another-planet');
    expect(response.body.data.userId).not.toBeDefined();

    const planetRepository = superSave.getRepository<Planet>(planetEntity.name);
    const planet = await planetRepository.getById(response.body.data.id);
    expect(planet).toBeDefined();
    expect((planet as Planet).userId).toEqual(USER_ID_1);
  });
});

describe('deleteBefore', () => {
  it('allows deleting the planet for the user', async () => {
    await superSavePromise;
    await superTest
      .delete(`/api/planets/${PLANET_1}`)
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(204);
  });

  it('bans deleting the planet for a different user', async () => {
    await superSavePromise;
    await superTest
      .delete(`/api/planets/${PLANET_2}`)
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .expect(401);
  });
});
