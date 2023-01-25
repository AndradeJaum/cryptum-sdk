const nock = require('nock')
const chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const AxiosApi = require('../../src/axios')
const { TransactionController } = require('../../src/features/transaction/controller')
const { Protocol } = require('../../src/services/blockchain/constants')
const { getWallets, config } = require('../wallet/constants')
const { TransactionType } = require('../../src/features/transaction/entity')
const txController = new TransactionController(config)
const axiosApi = new AxiosApi(config)
const baseUrl = axiosApi.getBaseUrl(config.environment)
const contractAddress = '0x2B751008e680E1921161C5456a763e72788Db9Ca'
const contractAbiUpdate = [
  {
    constant: false,
    inputs: [
      {
        internalType: 'string',
        name: 'newMessage',
        type: 'string',
      },
    ],
    name: 'update',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
const contractAbiMessage = [
  {
    constant: true,
    inputs: [],
    name: 'message',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
]
let wallets = {}

describe.only('Celo smart contract transactions', () => {
  before(async () => {
    wallets = await getWallets()

    nock(baseUrl)
      .get(`/wallet/${wallets.celo.address}/info`)
      .query({ protocol: Protocol.CELO })
      .reply(200, {
        nonce: '2',
      })
      .persist()
      .post(`/fee?protocol=${Protocol.CELO}`, {
        type: TransactionType.CALL_CONTRACT_METHOD,
        from: '0xb8a29fa1876eb806e411f15d2d94c8e80fb72e23',
        contractAddress,
        contractAbi: contractAbiUpdate,
        method: 'update',
        params: ['new message'],
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 44787,
      })
      .persist()
      .post(`/transaction/call-method?protocol=${Protocol.CELO}`, {
        contractAddress,
        contractAbi: contractAbiMessage,
        method: 'message',
        params: [],
      })
      .reply(200, {
        result: 'hello',
      })
      .persist()
      .post(`/transaction/contract/compile?protocol=${Protocol.CELO}`, {
        contractName: 'Test',
        source: 'contract Test {}',
        params: ['new message'],
      })
      .reply(200, {
        bytecode: '',
        abi: [],
      })
      .persist()
      .post(`/transaction/contract/compile?protocol=${Protocol.CELO}`, {
        tokenType: 'ERC20',
        params: ['new message'],
      })
      .reply(200, {
        bytecode: '',
        abi: [],
      })
      .persist()
      .post(`/fee?protocol=${Protocol.CELO}`, {
        type: TransactionType.DEPLOY_CONTRACT,
        from: '0xb8a29fa1876eb806e411f15d2d94c8e80fb72e23',
        contractName: 'Test',
        source: 'contract Test {}',
        params: ['new message'],
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 4,
      })
      .persist()
      .post(`/fee?protocol=${Protocol.CELO}`, {
        type: TransactionType.DEPLOY_ERC20,
        from: '0xb8a29fa1876eb806e411f15d2d94c8e80fb72e23',
        tokenType: 'ERC20',
        params: ['new message'],
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 4,
      })
      .persist()
  })
  after(() => {
    nock.isDone()
  })

  it.skip('create smart contract call transaction', async () => {
    const transaction = await txController.createSmartContractTransaction({
      wallet: wallets.celo,
      contractAddress,
      contractAbi: contractAbiUpdate,
      method: 'update',
      params: ['new message'],
      protocol: Protocol.CELO,
      testnet: true,
    })
    assert.include(transaction.signedTx, '0x')
    // console.log(await txController.sendTransaction(transaction))
  })
  it.skip('create smart contract call transaction failed when wallet is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractTransaction({
        wallet: null,
        contractAddress,
        contractAbi: contractAbiUpdate,
        method: 'update',
        params: ['new message'],
        protocol: Protocol.CELO,
        testnet: true,
      })
    )
  })
  it.skip('create smart contract call transaction failed when contract address is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractTransaction({
        wallet: wallets.celo,
        contractAddress: undefined,
        contractAbi: contractAbiUpdate,
        method: 'update',
        params: ['new message'],
        protocol: Protocol.CELO,
      })
    )
  })
  it.skip('create smart contract call transaction failed when contract abi is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractTransaction({
        wallet: wallets.celo,
        contractAddress,
        contractAbi: null,
        method: 'update',
        params: ['new message'],
        protocol: Protocol.CELO,
      })
    )
  })
  it.skip('call smart contract method', async () => {
    const response = await txController.callSmartContractMethod({
      contractAddress,
      contractAbi: contractAbiMessage,
      method: 'message',
      params: [],
      protocol: Protocol.CELO,
      testnet: true,
    })
    assert.strictEqual(response.result, 'hello')
  })
  it.skip('call smart contract method failed when constract address missing', async () => {
    assert.isRejected(
      txController.callSmartContractMethod({
        contractAbi: contractAbiMessage,
        method: 'message',
        params: [],
        protocol: Protocol.CELO,
        testnet: true,
      })
    )
  })
  it.skip('call smart contract method failed when constract abi missing', async () => {
    assert.isRejected(
      txController.callSmartContractMethod({
        contractAddress,
        method: 'message',
        params: [],
        protocol: Protocol.CELO,
        testnet: true,
      })
    )
  })

  it.skip('throws smart contract deploy transaction failed when wallet is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractDeployTransaction({
        params: ['new message'],
        protocol: Protocol.CELO,
        testnet: true,
        contractName: 'Test',
        source: 'contract Test {}',
      })
    )
  })
  it.skip('throws smart contract deploy transaction failed when params is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractDeployTransaction({
        wallet: wallets.celo,
        protocol: Protocol.CELO,
        testnet: true,
        contractName: 'Test',
        source: 'contract Test {}',
      })
    )
  })
  it.skip('throws smart contract deploy transaction failed when contract name is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractDeployTransaction({
        wallet: wallets.celo,
        protocol: Protocol.CELO,
        testnet: true,
        source: 'contract Test {}',
      })
    )
  })
  it.skip('throws smart contract deploy transaction failed when source is invalid', async () => {
    assert.isRejected(
      txController.createSmartContractDeployTransaction({
        wallet: wallets.celo,
        protocol: Protocol.CELO,
        testnet: true,
        contractName: 'Test',
      })
    )
  })

  it.skip('create smart contract deploy transaction', async () => {
    const transaction = await txController.createSmartContractDeployTransaction({
      wallet: wallets.celo,
      params: ['new message'],
      protocol: Protocol.CELO,
      testnet: true,
      contractName: 'Test',
      source: 'contract Test {}'
    })
    assert.include(transaction.signedTx, '0x')
    // console.log(await txController.sendTransaction(transaction))
  })
  it.skip('create smart contract token deploy transaction', async () => {
    const transaction = await txController.createTokenDeployTransaction({
      wallet: wallets.celo,
      params: ['new message'],
      protocol: Protocol.CELO,
      testnet: true,
      tokenType: 'ERC20',
    })
    assert.include(transaction.signedTx, '0x')
  })
  it.skip('throws smart contract token deploy transaction failed when wallet is invalid', async () => {
    assert.isRejected(
      txController.createTokenDeployTransaction({
        params: ['new message'],
        protocol: Protocol.CELO,
        testnet: true,
        tokenType: 'ERC20',
      })
    )
  })
  it.skip('throws smart contract token deploy transaction failed when params is invalid', async () => {
    assert.isRejected(
      txController.createTokenDeployTransaction({
        wallet: wallets.celo,
        protocol: Protocol.CELO,
        testnet: true,
        tokenType: 'ERC20',
      })
    )
  })
  it.skip('throws smart contract token deploy transaction failed when token type is invalid', async () => {
    assert.isRejected(
      txController.createTokenDeployTransaction({
        wallet: wallets.celo,
        protocol: Protocol.CELO,
        testnet: true,
        params: ['new message'],
      })
    )
  })
})
