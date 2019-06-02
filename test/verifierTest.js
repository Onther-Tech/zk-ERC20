const verifier = artifacts.require("verifier");
const fs = require('fs');
const BN = require('bn.js');

//TODO : Delete All 00...0 in proof.input and convert to String and add "0x"
contract('verifier', function(accounts) {
  it('verifyTx', async function() {
    let proofJson = fs.readFileSync('./zk-related/proof.json', 'utf8');
    // var rx2 = /([0-9]+)[,]/gm;
    // // console.log(proofJson);
    // console.log(proofJson.match(rx2))
    // proofJson.match(rx2).forEach(p => {
    //   proofJson = proofJson.replace(p, `"${p.slice(0, p.length-1)}",`)
    // })
    proofJson = JSON.parse(proofJson);
    console.log(proofJson)

    const proof = proofJson.proof;
    const input = proofJson.input;
    // console.log(input);
    // input.forEach((i, key) => {
    //   if (typeof i == 'number') i = i.toString();
    //   input[key] = '0x' + new BN(i, 10).toString('hex')
    // })

    const _proof = [];
    Object.keys(proof).forEach(key => _proof.push(proof[key]));
    _proof.push(input)

    let instance = await verifier.deployed();
    console.log('calling verifyTx with proof', _proof);
    const success = await instance.verifyTx(..._proof);
    assert(success);
    console.log("success", success);
  })
})
