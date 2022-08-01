// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const keccak256 = require('keccak256');
const {default: MerkleTree} = require('merkletreejs');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  // const Greeter = await hre.ethers.getContractFactory("Greeter");
  // const greeter = await Greeter.deploy("Hello, Hardhat!");

  // await greeter.deployed();

  // console.log("Greeter deployed to:", greeter.address);

  let cat = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  ];

  const leaves = cat.map((addr) => keccak256(addr));
  const tree = new MerkleTree(leaves, keccak256, {sortPairs: true});
  const buf2hex = (x) => '0x' + x.toString('hex');

  console.log('root: ', buf2hex(tree.getRoot()));

  const leaf = keccak256('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
  proof = tree.getProof(leaf).map((x) => buf2hex(x.data));

  console.log('proof: ', proof);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
