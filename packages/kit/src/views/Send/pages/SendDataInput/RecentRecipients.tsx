import { useMemo } from 'react';

import { useIntl } from 'react-intl';

import { Divider, SizableText, Skeleton, Stack } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { IAddressQueryResult } from '@onekeyhq/kit/src/components/AddressInput';
import { AddressListItem } from '@onekeyhq/kit/src/components/AddressList';
import { useAccountData } from '@onekeyhq/kit/src/hooks/useAccountData';
import { useDebounce } from '@onekeyhq/kit/src/hooks/useDebounce';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { ETranslations } from '@onekeyhq/shared/src/locale';

interface IRecentRecipientsProps {
  networkId: string;
  onSelect?: (params: {
    address: string;
    memo?: string;
    note?: string;
  }) => void;
  searchKey?: string;
  isSearchMode?: boolean;
}

function RecentRecipients(props: IRecentRecipientsProps) {
  const intl = useIntl();
  const { networkId, searchKey: rawSearchKey, isSearchMode, onSelect } = props;

  const { vaultSettings } = useAccountData({ networkId });
  const {
    result: recentRecipients = [],
    isLoading: isLoadingRecentRecipients,
  } = usePromiseResult<IAddressQueryResult[]>(
    async () => {
      const result =
        await backgroundApiProxy.serviceSignatureConfirm.getRecentRecipients({
          networkId,
          limit: 5,
        });

      return Promise.all(
        result.map((recipient) =>
          backgroundApiProxy.serviceAccountProfile.queryAddress({
            networkId,
            address: recipient,
            enableAddressBook: true,
            enableWalletName: true,
            enableAddressDeriveInfo: true,
            skipValidateAddress: true,
          }),
        ),
      );
    },
    [networkId],
    {
      initResult: [],
    },
  );

  const debouncedSearchKey = useDebounce(rawSearchKey, 300);
  const filteredRecentRecipients = useMemo(() => {
    const searchKey = debouncedSearchKey?.trim().toLowerCase();
    if (!isSearchMode || !searchKey) {
      return recentRecipients;
    }
    return recentRecipients.filter(
      (recipient) =>
        recipient.input?.toLowerCase().includes(searchKey) ||
        recipient.walletAccountName?.toLowerCase().includes(searchKey) ||
        recipient.addressBookName?.toLowerCase().includes(searchKey),
    );
  }, [debouncedSearchKey, isSearchMode, recentRecipients]);

  return (
    <Stack mx={-20}>
      <Divider mb="$5" borderColor="$borderSubdued" />
      <SizableText size="$bodyMd" color="$textSubdued" mb="$2" ml="$5">
        {intl.formatMessage({ id: ETranslations.transfer_recent_transfers })}
      </SizableText>
      {isLoadingRecentRecipients ? (
        <Stack px="$5" gap="$3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Stack key={index} minHeight="$11" justifyContent="center" gap="$1">
              <Skeleton h="$3" w={index === 0 ? '$24' : '$20'} />
              <Skeleton h="$3" w="$56" />
            </Stack>
          ))}
        </Stack>
      ) : null}
      {!isLoadingRecentRecipients && filteredRecentRecipients.length > 0
        ? filteredRecentRecipients.map((recipient) => (
            <AddressListItem
              key={recipient.input}
              memo={recipient.addressMemo}
              note={recipient.addressNote}
              accountName={
                recipient.addressBookName ?? recipient.walletAccountName
              }
              addressType={recipient.addressDeriveInfo?.label}
              address={recipient.input ?? ''}
              isLocal={
                !!(recipient.walletAccountName || recipient.addressBookName)
              }
              showAccount
              showType={
                vaultSettings?.mergeDeriveAssetsEnabled ||
                recipient.addressDeriveType !== 'default'
              }
              onPress={() => {
                onSelect?.({
                  address: recipient.input ?? '',
                  memo: recipient.addressMemo,
                  note: recipient.addressNote,
                });
              }}
            />
          ))
        : null}
      {!isLoadingRecentRecipients && filteredRecentRecipients.length === 0 ? (
        <AddressListItem
          isLocal
          address={intl.formatMessage({
            id: ETranslations.transfer_recent_transfers_empty,
          })}
        />
      ) : null}
    </Stack>
  );
}

export default RecentRecipients;
