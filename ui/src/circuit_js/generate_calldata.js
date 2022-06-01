/* global BigInt */

import { generateWitness } from './generate_witness';
import { groth16 } from 'snarkjs';

import { F1Field, Scalar} from  "ffjavascript"; 
const Fr = new F1Field(Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617"));


function unstringifyBigInts(o) {
    if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
        return BigInt(o);
    } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o===null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

export async function generateCalldata(input) {

    let generateWitnessSuccess = true;

    let formattedInput = {};
    
    for (var key in input) {
        formattedInput[key] = Fr.e(input[key]);
    }

    let witness = await generateWitness(formattedInput).then()
        .catch((error) => {
            console.error(error);
            generateWitnessSuccess = false;
        });
    
    //console.log(witness);

    if (!generateWitnessSuccess) { return; }

    const { proof, publicSignals } = await groth16.prove('circuit_final.zkey', witness);

    const editedPublicSignals = unstringifyBigInts(publicSignals);
    const editedProof = unstringifyBigInts(proof);
    const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

    const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

    //console.log(argv);

    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    const Input = argv.slice(8);

    return [a, b, c, Input];
}