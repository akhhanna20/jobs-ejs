const { app } = require('../app');
const get_chai = require('../util/get_chai');

describe('test multiply api', function () {
  it('should multiply two numbers', async () => {
    const { expect, request } = await get_chai();
    const res = await request(app) // Correct usage
      .get('/multiply')
      .query({ first: 7, second: 6 })
      .send();

    expect(res).to.have.status(200);
    expect(res).to.have.property('body');
    expect(res.body).to.have.property('result');
    expect(res.body.result).to.equal(42);
  });
});
