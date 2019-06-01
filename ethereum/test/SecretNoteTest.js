const SecretNote = artifacts.require("SecretNote");

const BN = require('bn.js');
const crypto = require('crypto');
const fs = require('fs');

const { getTransferZkParams } = require('../scripts/zokcmd');
const { zokratesExec } = require('../scripts/docker-helper');
const { fixProofJson } = require('../scripts/fix-proof');

// const exec = require('child_process').execFile;
// Promise = require('bluebird');

contract('SecretNote', function(accounts) {
  // const dockerImageName = "zokrates/zokrates";
  // let dockerContainerName;

  let instance;
  let enc;

  const initialAmount = '5';
  const transferAmount = '3';
  const changeAmount = '2';

  before(async () => {
    instance  = await SecretNote.deployed();
    enc = await encrypt(accounts[0].slice(2), initialAmount);
  })



  it('createNoteDummy', async function() {
    // const e = await encrypt('2B522cABE9950D1153c26C1b399B293CaA99FcF9', '5');
    // const d = await decrypt(e);
    // console.log('enc', enc);
    // console.log('decrypt Test', decrypt(enc));
    const tx = await instance.createNote(accounts[0], '0x' + initialAmount, enc);
    // console.dir(tx, {depth: null});

    noteId = tx.logs[0].args.noteId;
    const index = tx.logs[0].args.index;
    console.log('noteId', noteId);
    console.log('index', index);

    // get note by noteId
    const state = await instance.notes(noteId);
    console.log('state', state.toNumber()); // state 1
    console.log('allnote.length', await instance.getNotesLength());


    const res = getTransferZkParams(
      accounts[0],
      '0x' + initialAmount,
      accounts[1],
      '0x' + transferAmount,
    );

    console.log("getTransferZkParams()", res);

    // make witness
    await zokratesExec(res);

    // make proofj.json
    await zokratesExec("zokrates generate-proof --proving-scheme pghr13");

    // fix proof.json
    fixProofJson();
  })

  it('transferNoteTest', async function() {

    //TODO : Compute Witness
    //TODO : Get rid of 0 in proof.input and change to String and add "0x"

    let proofJson = fs.readFileSync('./zk-related/proof.json', 'utf8');
    proofJson = JSON.parse(proofJson);
    const proof = proofJson.proof;
    const input = proofJson.input;
    const _proof = [];
    Object.keys(proof).forEach(key => _proof.push(proof[key]));
    _proof.push(input)

    const encNote1 = await encrypt(accounts[1].slice(2), transferAmount);
    const encNote2 = await encrypt(accounts[0].slice(2), changeAmount);

    const transferTx = await instance.transferNote(..._proof, encNote1, encNote2);
    assert(transferTx);

    const state1 = await instance.notes(transferTx.logs[1].args.noteId);
    console.log('state1', state1.toNumber()); // new note 1 state

    const state2 = await instance.notes(transferTx.logs[2].args.noteId);
    console.log('state2', state2.toNumber()); // new note 2 state
  });
});



async function encrypt(address, _amount) {
  // 20 12
  let amount = new BN(_amount, 16).toString(16, 24); // 12 bytes = 24 chars in hex
  const payload = address + amount;
  console.log('enc payload', payload)
  const encryptedNote = await web3.eth.accounts.encrypt('0x' + payload, 'vitalik')
  return JSON.stringify(encryptedNote);
}

async function decrypt(cipher) {
  let payload = await web3.eth.accounts.decrypt(JSON.parse(cipher), 'vitalik').privateKey
  payload = payload.slice(2)
  const address = payload.slice(0, 40) // remove 0x and
  const amount = payload.slice(40)
  console.log(address, amount);

  // pad address and amount to 32bytes
  let _address = new BN(address, 16).toString(16, 64);
  let _amount = new BN(amount, 16).toString(16, 64); // 32 bytes = 64 chars in hex
  const buf = Buffer.from(_address + _amount, 'hex');
  const digest = crypto.createHash('sha256').update(buf).digest('hex');
  return digest;
}

function promiseFromChildProcess(child) {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}
