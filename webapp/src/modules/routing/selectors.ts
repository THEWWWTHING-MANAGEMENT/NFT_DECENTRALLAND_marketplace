import { createSelector } from 'reselect'
import {
  getSearch as getRouterSearch,
  getLocation
} from 'connected-react-router'
import { EmotePlayMode, Network, Rarity } from '@dcl/schemas'
import { getView } from '../ui/browse/selectors'
import { View } from '../ui/types'
import { WearableGender } from '../nft/wearable/types'
import { VendorName } from '../vendor/types'
import { isVendor } from '../vendor/utils'
import { Section, Sections } from '../vendor/routing/types'
import { RootState } from '../reducer'
import {
  getDefaultOptionsByView,
  getURLParamArray,
  getURLParam
} from './search'
import { BrowseOptions, SortBy } from './types'
import { locations } from './locations'
import { AssetType } from '../asset/types'
import { getAddress as getWalletAddress } from '../wallet/selectors'
import { getAddress as getAccountAddress } from '../account/selectors'
import { getContracts as getAllContracts } from '../contract/selectors'
import { Contract } from '../vendor/services'
import { isLandSection } from '../ui/utils'

export const getState = (state: RootState) => state.routing

const getPathName = createSelector<
  RootState,
  ReturnType<typeof getLocation>,
  string
>(getLocation, location => location.pathname)

export const getVendor = createSelector<RootState, string, VendorName>(
  getRouterSearch,
  search => {
    const vendor = getURLParam<VendorName>(search, 'vendor')
    if (vendor && isVendor(vendor)) {
      return vendor
    }
    return VendorName.DECENTRALAND
  }
)

export const getSection = createSelector<
  RootState,
  string,
  ReturnType<typeof getPathName>,
  VendorName,
  Section
>(getRouterSearch, getPathName, getVendor, (search, pathname, vendor) => {
  const section = getURLParam<string>(search, 'section') ?? ''
  if (!section && pathname === locations.lands()) {
    return Sections.decentraland.LAND
  }

  if (
    (!section || section === Sections[vendor].ALL) &&
    pathname === locations.browse() &&
    vendor === VendorName.DECENTRALAND
  ) {
    return Sections.decentraland.WEARABLES
  }

  if (!section || !(section.toUpperCase() in Sections[vendor])) {
    return Sections[vendor].ALL
  }

  return section as Section
})

export const getPage = createSelector<RootState, string, number>(
  getRouterSearch,
  search => {
    const page = getURLParam(search, 'page')
    return page === null || isNaN(+page) ? 1 : +page
  }
)

export const getSortBy = createSelector<
  RootState,
  string,
  View | undefined,
  SortBy | undefined
>(
  getRouterSearch,
  getView,
  (search, view) =>
    getURLParam<SortBy>(search, 'sortBy') ||
    getDefaultOptionsByView(view).sortBy
)

export const getOnlyOnSale = createSelector<
  RootState,
  string,
  View | undefined,
  Section | undefined,
  boolean | undefined
>(getRouterSearch, getView, getSection, (search, view, section) => {
  const onlyOnSale = getURLParam(search, 'onlyOnSale')
  switch (onlyOnSale) {
    case 'true':
      return true
    case 'false':
      return false
    default:
      return isLandSection(section)
        ? undefined
        : getDefaultOptionsByView(view).onlyOnSale!
  }
})

export const getOnlyOnRent = createSelector<
  RootState,
  string,
  boolean | undefined
>(getRouterSearch, search => {
  const onlyOnRent = getURLParam(search, 'onlyOnRent')
  switch (onlyOnRent) {
    case 'true':
      return true
    case 'false':
      return false
    default:
      return undefined
  }
})

export const getIsSoldOut = createSelector<
  RootState,
  string,
  boolean | undefined
>(getRouterSearch, search => {
  const isSoldOut = getURLParam(search, 'isSoldOut')
  return isSoldOut === 'true'
})

export const getIsMap = createSelector<RootState, string, boolean | undefined>(
  getRouterSearch,
  search => {
    const isMap = getURLParam(search, 'isMap')
    return isMap === null ? undefined : isMap === 'true'
  }
)

export const getItemId = createSelector<RootState, string, string | undefined>(
  getRouterSearch,
  search => {
    const itemId = getURLParam(search, 'isSoldOut')
    return itemId ? itemId : undefined
  }
)

export const getIsFullscreen = createSelector<
  RootState,
  string,
  boolean | undefined,
  boolean | undefined
>(getRouterSearch, getIsMap, (search, isMap) => {
  const isFullscreen = getURLParam(search, 'isFullscreen')
  return isFullscreen === null ? undefined : isMap && isFullscreen === 'true'
})

export const getRarities = createSelector<RootState, string, Rarity[]>(
  getRouterSearch,
  search =>
    getURLParamArray<Rarity>(
      search,
      'rarities',
      Object.values(Rarity).filter(
        value => typeof value === 'string'
      ) as string[]
    )
)

export const getWearableGenders = createSelector<
  RootState,
  string,
  WearableGender[]
>(getRouterSearch, search =>
  getURLParamArray<WearableGender>(
    search,
    'genders',
    Object.values(WearableGender)
  )
)

// TODO(/contracts): think the cases and test if we need to wait until load
export const getContracts = createSelector<
  RootState,
  Contract[],
  string,
  string[]
>(getAllContracts, getRouterSearch, (contracts, search) =>
  getURLParamArray<string>(
    search,
    'contracts',
    contracts.map(contract => contract.address)
  )
)

export const getSearch = createSelector<RootState, string, string>(
  getRouterSearch,
  search => getURLParam(search, 'search') || ''
)

export const getNetwork = createSelector<
  RootState,
  string,
  Network | undefined
>(
  getRouterSearch,
  search => (getURLParam(search, 'network') as Network) || undefined
)

export const getAssetType = createSelector<
  RootState,
  string,
  string,
  VendorName,
  AssetType
>(getRouterSearch, getPathName, getVendor, (search, pathname, vendor) => {
  let assetTypeParam = getURLParam(search, 'assetType') ?? ''

  if (!assetTypeParam || !(assetTypeParam.toUpperCase() in AssetType)) {
    if (vendor === VendorName.DECENTRALAND && pathname === locations.browse()) {
      return AssetType.ITEM
    }
    return AssetType.NFT
  }
  return assetTypeParam as AssetType
})

export const getEmotePlayMode = createSelector<
  RootState,
  string,
  EmotePlayMode | undefined
>(
  getRouterSearch,
  search => (getURLParam(search, 'emotePlayMode') as EmotePlayMode) || undefined
)

export const getViewAsGuest = createSelector<RootState, string, boolean>(
  getRouterSearch,
  search => getURLParam(search, 'viewAsGuest') === 'true'
)
export const getOnlySmart = createSelector<RootState, string, boolean>(
  getRouterSearch,
  search => getURLParam(search, 'onlySmart') === 'true'
)

export const hasFiltersEnabled = createSelector<
  RootState,
  string | undefined,
  WearableGender[],
  Rarity[],
  string[],
  string | undefined,
  boolean
>(
  getNetwork,
  getWearableGenders,
  getRarities,
  getContracts,
  getEmotePlayMode,
  (network, genders, rarities, contracts, playMode) => {
    const hasNetworkFilter = network !== undefined
    const hasGenderFilter = genders.length > 0
    const hasRarityFilter = rarities.length > 0
    const hasContractsFilter = contracts.length > 0
    const hasEmotePlayModeFilter = playMode !== undefined
    return (
      hasNetworkFilter ||
      hasGenderFilter ||
      hasRarityFilter ||
      hasContractsFilter ||
      hasEmotePlayModeFilter
    )
  }
)

export const getCurrentLocationAddress = createSelector<
  RootState,
  string,
  string | undefined,
  string | undefined,
  string | undefined
>(
  getPathName,
  getWalletAddress,
  getAccountAddress,
  (pathname, walletAddess, accountAddress) => {
    let address: string | undefined

    if (pathname === locations.currentAccount()) {
      address = walletAddess
    } else {
      address = accountAddress
    }

    return address ? address.toLowerCase() : undefined
  }
)

export const getPaginationUrlParams = createSelector(
  getPage,
  getSortBy,
  getSearch,
  (page, sortBy, search) => ({ page, sortBy, search })
)

export const getAssetsUrlParams = createSelector(
  getOnlyOnSale,
  getOnlySmart,
  getIsSoldOut,
  getItemId,
  getContracts,
  (onlyOnSale, onlySmart, isSoldOut, itemId, contracts) => ({
    onlyOnSale,
    onlySmart,
    isSoldOut,
    itemId,
    contracts
  })
)

export const getLandsUrlParams = createSelector(
  getIsMap,
  getIsFullscreen,
  (isMap, isFullscreen) => ({ isMap, isFullscreen })
)

export const getWearablesUrlParams = createSelector(
  getRarities,
  getWearableGenders,
  getView,
  getViewAsGuest,
  (rarities, wearableGenders, view, viewAsGuest) => ({
    rarities,
    wearableGenders,
    view,
    viewAsGuest
  })
)

export const getCurrentBrowseOptions = createSelector(
  getAssetType,
  getCurrentLocationAddress,
  getVendor,
  getSection,
  getNetwork,
  getEmotePlayMode,
  getPaginationUrlParams,
  getAssetsUrlParams,
  getLandsUrlParams,
  getWearablesUrlParams,
  getOnlyOnRent,
  getOnlyOnSale,
  (
    assetType,
    address,
    vendor,
    section,
    network,
    emotePlayMode,
    paginationUrlParams,
    AssetsUrlParams,
    landsUrlParams,
    wearablesUrlParams,
    onlyOnRent,
    onlyOnSale
  ) =>
    ({
      assetType,
      address,
      vendor,
      section,
      network,
      emotePlayMode,
      ...AssetsUrlParams,
      ...paginationUrlParams,
      ...landsUrlParams,
      ...wearablesUrlParams,
      onlyOnRent,
      onlyOnSale
    } as BrowseOptions)
)
