import { uniq } from "lodash-es"
import { FC, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import {
  removePreAuthorization,
  resetPreAuthorizations,
  usePreAuthorizations,
} from "../../../shared/preAuthorizations"
import { Button } from "../../components/Button"
import { IconBar } from "../../components/IconBar"
import { H2, P } from "../../theme/Typography"
import { DappConnection } from "./DappConnection"

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 32px 24px 32px;

  ${P} {
    margin: 16px 0;
  }

  ${Button} {
    margin-top: 8px;
  }

  > * + * {
    margin-top: 8px;
  }
`

export const DappConnectionsSettingsScreen: FC = () => {
  const navigate = useNavigate()

  const preAuthorizations = usePreAuthorizations()

  const preauthorizedHosts = useMemo<string[]>(() => {
    return uniq(
      preAuthorizations.map((preAuthorization) => preAuthorization.host),
    )
  }, [preAuthorizations])

  return (
    <>
      <IconBar back />
      <Wrapper>
        <H2>Dapp connections</H2>
        {preauthorizedHosts === null ? null : preauthorizedHosts.length ===
          0 ? (
          <P>You haven&apos;t connected to any dapp yet.</P>
        ) : (
          <>
            {preauthorizedHosts.map((host) => (
              <DappConnection
                key={host}
                host={host}
                onRemoveClick={async () => {
                  /** passing null as accountAddress will remove all accounts */
                  await removePreAuthorization(host)
                }}
              />
            ))}

            <P>Require all dapps to request a new connection to your wallet?</P>
            <Button
              onClick={() => {
                resetPreAuthorizations()
                navigate(-1)
              }}
            >
              Reset all dapp connections
            </Button>
          </>
        )}
      </Wrapper>
    </>
  )
}
