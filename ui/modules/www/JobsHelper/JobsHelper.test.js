// import

import {expect} from 'chai';
import {jobToClient, jobToServer} from './JobsHelper.js';

// test

describe('jobToClient', () => {
  it('should convert resultEmail to \\n-separated string', () => {
    expect(jobToClient({resultEmail: ['1', '2']})).to.have.property('resultEmail', '1\n2');
  });

  it('should convert statusEmail to \\n-separated string', () => {
    expect(jobToClient({statusEmail: ['1', '2']})).to.have.property('statusEmail', '1\n2');
  });
});

describe('jobToServer', () => {
  it('should covert resultEmail to array on \\n', () => {
    expect(jobToServer({resultEmail: '1\n2'}).resultEmail).to.include('1');
  });

  it('should covert statusEmail to array on \\n', () => {
    expect(jobToServer({statusEmail: '1\n2'}).statusEmail).to.include('1');
  });
});
