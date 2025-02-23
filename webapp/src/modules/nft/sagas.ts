import { takeEvery, call, put, select } from 'redux-saga/effects'
import { RentalListing, RentalStatus } from '@dcl/schemas'
import { ErrorCode } from 'decentraland-transactions'
import { waitForTx } from 'decentraland-dapps/dist/modules/transaction/utils'
import { t } from 'decentraland-dapps/dist/modules/translation/utils'
import { isErrorWithMessage } from '../../lib/error'
import { getWallet } from '../wallet/selectors'
import { Vendor, VendorFactory } from '../vendor/VendorFactory'
import { getContract, getContracts } from '../contract/selectors'
import { VendorName } from '../vendor/types'
import { AwaitFn } from '../types'
import { getOrWaitForContracts } from '../contract/utils'
import { getRentalById } from '../rental/selectors'
import {
  isRentalListingOpen,
  waitUntilRentalChangesStatus
} from '../rental/utils'
import {
  DEFAULT_BASE_NFT_PARAMS,
  FETCH_NFTS_REQUEST,
  FetchNFTsRequestAction,
  fetchNFTsSuccess,
  fetchNFTsFailure,
  FETCH_NFT_REQUEST,
  FetchNFTRequestAction,
  fetchNFTSuccess,
  fetchNFTFailure,
  TRANSFER_NFT_REQUEST,
  TransferNFTRequestAction,
  transferNFTSuccess,
  transferNFTFailure,
  transferNFTransactionSubmitted
} from './actions'
import { NFT } from './types'

export function* nftSaga() {
  yield takeEvery(FETCH_NFTS_REQUEST, handleFetchNFTsRequest)
  yield takeEvery(FETCH_NFT_REQUEST, handleFetchNFTRequest)
  yield takeEvery(TRANSFER_NFT_REQUEST, handleTransferNFTRequest)
}

function* handleFetchNFTsRequest(action: FetchNFTsRequestAction) {
  const { options, timestamp } = action.payload
  const { vendor: VendorName, filters } = options
  const contracts: ReturnType<typeof getContracts> = yield select(getContracts)

  const params = {
    ...DEFAULT_BASE_NFT_PARAMS,
    ...action.payload.options.params,
    contracts
  }

  try {
    const vendor: Vendor<VendorName> = yield call(
      VendorFactory.build,
      VendorName
    )

    const [
      nfts,
      accounts,
      orders,
      rentals,
      count
    ]: AwaitFn<typeof vendor.nftService.fetch> = yield call(
      [vendor.nftService, 'fetch'],
      params,
      filters
    )

    yield put(
      fetchNFTsSuccess(
        options,
        nfts as NFT[],
        accounts,
        orders,
        rentals,
        count,
        timestamp
      )
    )
  } catch (error) {
    yield put(fetchNFTsFailure(options, (error as Error).message, timestamp))
  }
}

function* handleFetchNFTRequest(action: FetchNFTRequestAction) {
  const { contractAddress, tokenId, options } = action.payload

  try {
    yield call(getOrWaitForContracts)

    const contract: ReturnType<typeof getContract> = yield select(getContract, {
      address: contractAddress
    })

    if (!contract || !contract.vendor) {
      throw new Error(
        `Couldn't find a valid vendor for contract ${contract?.address}`
      )
    }

    const vendor: Vendor<VendorName> = yield call(
      VendorFactory.build,
      contract.vendor
    )

    const [
      nft,
      order,
      rental
    ]: AwaitFn<typeof vendor.nftService.fetchOne> = yield call(
      [vendor.nftService, 'fetchOne'],
      contractAddress,
      tokenId,
      options
    )

    yield put(fetchNFTSuccess(nft as NFT, order, rental))
  } catch (error) {
    yield put(
      fetchNFTFailure(contractAddress, tokenId, (error as Error).message)
    )
  }
}

function* handleTransferNFTRequest(action: TransferNFTRequestAction) {
  const { nft, address } = action.payload
  try {
    const vendor: Vendor<VendorName> = yield call(
      VendorFactory.build,
      nft.vendor
    )

    const wallet: ReturnType<typeof getWallet> = yield select(getWallet)
    if (!wallet) {
      throw new Error('A wallet is needed to perform a NFT transfer request')
    }

    const txHash: string = yield call(
      [vendor.nftService, 'transfer'],
      wallet,
      address,
      nft
    )
    yield put(transferNFTransactionSubmitted(nft, address, txHash))
    if (nft?.openRentalId) {
      yield call(waitForTx, txHash)
      const rental: RentalListing | null = yield select(
        getRentalById,
        nft.openRentalId
      )
      if (isRentalListingOpen(rental)) {
        yield call(waitUntilRentalChangesStatus, nft, RentalStatus.CANCELLED)
      }
    }

    yield put(transferNFTSuccess(nft, address))
  } catch (error) {
    const errorMessage = isErrorWithMessage(error)
      ? error.message
      : t('global.unknown_error')
    const errorCode =
      error !== undefined &&
      error !== null &&
      typeof error === 'object' &&
      'code' in error
        ? (error as { code: ErrorCode }).code
        : undefined
    yield put(transferNFTFailure(nft, address, errorMessage, errorCode))
  }
}
