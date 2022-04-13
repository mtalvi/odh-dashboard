import * as React from 'react';
import * as _ from 'lodash-es';
import {
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupText,
  InputGroupTextVariant,
  PageSection,
  PageSectionVariants,
  Radio,
  Text,
  TextInput,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import { fetchClusterSettings, updateClusterSettings } from '../../services/clusterSettingsService';
import { ClusterSettings } from '../../types';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../redux/actions/actions';
import {
  DEFAULT_CONFIG,
  DEFAULT_PVC_SIZE,
  DEFAULT_CULLER_TIMEOUT,
  MIN_PVC_SIZE,
  MAX_PVC_SIZE,
  CULLER_TIMEOUT_LIMITED,
  CULLER_TIMEOUT_UNLIMITED,
  MAX_MINUTE,
  MIN_MINUTE,
  MIN_HOUR,
  MAX_HOUR,
  DEFAULT_HOUR,
} from './const';
import { getTimeoutByHourAndMinute, getHourAndMinuteByTimeout } from '../../utilities/utils';

import './ClusterSettings.scss';

const description = `Update global settings for all users.`;

const ClusterSettings: React.FC = () => {
  const isEmpty = false;
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number | string>(DEFAULT_PVC_SIZE);
  const [cullerTimeoutChecked, setCullerTimeoutChecked] =
    React.useState<string>(CULLER_TIMEOUT_UNLIMITED);
  const [cullerTimeout, setCullerTimeout] = React.useState<number>(DEFAULT_CULLER_TIMEOUT);
  const [hour, setHour] = React.useState<number>(DEFAULT_HOUR);
  const [minute, setMinute] = React.useState<number>(0);
  const pvcDefaultBtnRef = React.useRef<HTMLButtonElement>();
  const dispatch = useDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((clusterSettings: ClusterSettings) => {
        setLoaded(true);
        setLoadError(undefined);
        setClusterSettings(clusterSettings);
        setPvcSize(clusterSettings.pvcSize);
        if (clusterSettings.cullerTimeout !== DEFAULT_CULLER_TIMEOUT) {
          setCullerTimeoutChecked(CULLER_TIMEOUT_LIMITED);
          setHour(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).hour);
          setMinute(getHourAndMinuteByTimeout(clusterSettings.cullerTimeout).minute);
        }
        setCullerTimeout(clusterSettings.cullerTimeout);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  React.useEffect(() => {
    setCullerTimeout(getTimeoutByHourAndMinute(hour, minute));
  }, [hour, minute]);

  const radioCheckedChange = (_, event) => {
    const { value } = event.currentTarget;
    setCullerTimeoutChecked(value);
    if (value === CULLER_TIMEOUT_UNLIMITED) {
      setCullerTimeout(DEFAULT_CULLER_TIMEOUT);
      submitClusterSettings({ pvcSize, cullerTimeout: DEFAULT_CULLER_TIMEOUT });
    } else if (value === CULLER_TIMEOUT_LIMITED) {
      setCullerTimeout(getTimeoutByHourAndMinute(hour, minute));
      submitClusterSettings({ pvcSize, cullerTimeout: getTimeoutByHourAndMinute(hour, minute) });
    }
  };

  const onEnterPress = (event) => {
    if (event.key === 'Enter') {
      if (pvcDefaultBtnRef.current) {
        pvcDefaultBtnRef.current.focus();
      }
    }
  };

  const submitClusterSettings = (newClusterSettings: ClusterSettings) => {
    if (!_.isEqual(clusterSettings, newClusterSettings)) {
      if (
        Number(newClusterSettings?.pvcSize) !== 0 &&
        Number(newClusterSettings?.cullerTimeout) !== 0
      ) {
        updateClusterSettings(newClusterSettings)
          .then((response) => {
            if (response.success) {
              setClusterSettings(newClusterSettings);
              dispatch(
                addNotification({
                  status: 'success',
                  title: 'Cluster settings updated successfully.',
                  timestamp: new Date(),
                }),
              );
            } else {
              throw new Error(response.error);
            }
          })
          .catch((e) => {
            dispatch(
              addNotification({
                status: 'danger',
                title: 'Error',
                message: e.message,
                timestamp: new Date(),
              }),
            );
          });
      }
    }
  };

  return (
    <ApplicationsPage
      title="Cluster Settings"
      description={description}
      loaded={loaded}
      empty={isEmpty}
      loadError={loadError}
      errorMessage="Unable to load cluster settings."
      emptyMessage="No cluster settings found."
    >
      {!isEmpty ? (
        <PageSection
          className="odh-cluster-settings"
          variant={PageSectionVariants.light}
          padding={{ default: 'noPadding' }}
        >
          <Form
            className="odh-cluster-settings__form"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <FormGroup fieldId="pvc-size" label="PVC size">
              <Text>
                Changing the PVC size changes the storage size attached to the new notebook servers
                for all users.
              </Text>
              <InputGroup>
                <TextInput
                  className="odh-number-input"
                  name="pvc"
                  id="pvc-size-input"
                  type="text"
                  aria-label="PVC Size Input"
                  value={pvcSize}
                  pattern="/^(\s*|\d+)$/"
                  onBlur={() => {
                    submitClusterSettings({ pvcSize: Number(pvcSize), cullerTimeout });
                  }}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') {
                      if (pvcDefaultBtnRef.current) pvcDefaultBtnRef.current.focus();
                    }
                  }}
                  onChange={async (value: string) => {
                    const modifiedValue = value.replace(/ /g, '');
                    if (modifiedValue !== '') {
                      let newValue = Number.isInteger(Number(modifiedValue))
                        ? Number(modifiedValue)
                        : pvcSize;
                      newValue =
                        newValue > MAX_PVC_SIZE
                          ? MAX_PVC_SIZE
                          : newValue < MIN_PVC_SIZE
                          ? MIN_PVC_SIZE
                          : newValue;
                      setPvcSize(newValue);
                    } else {
                      setPvcSize(modifiedValue);
                    }
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>GiB</InputGroupText>
              </InputGroup>
              <Button
                innerRef={pvcDefaultBtnRef}
                variant={ButtonVariant.secondary}
                onClick={() => {
                  setPvcSize(DEFAULT_PVC_SIZE);
                  submitClusterSettings({ pvcSize: DEFAULT_PVC_SIZE, cullerTimeout });
                }}
              >
                Restore Default
              </Button>
              <HelperText>
                <HelperTextItem
                  variant={pvcSize === '' ? 'error' : 'indeterminate'}
                  hasIcon={pvcSize === ''}
                >
                  Note: PVC size must be between 1 GiB and 16384 GiB.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
            <FormGroup
              fieldId="culler-timeout"
              label="Stop idle notebooks"
              helperText="All idle notebooks are stopped at cluster log out. To edit the cluster log
                out time, discuss with your OpenShift Administrator to see if the OpenShift Authentication Timeout value can be modified."
            >
              <Text>Set the time limit for idle notebooks to be stopped.</Text>
              <Radio
                id="culler-timeout-unlimited"
                label="Do not stop idle notebooks"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                name={CULLER_TIMEOUT_UNLIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_UNLIMITED}
              />
              <Radio
                id="culler-timeout-limited"
                label="Stop idle notebooks after"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED}
                name={CULLER_TIMEOUT_LIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_LIMITED}
              />
              <InputGroup className="odh-cluster-settings__culler-input-group">
                <TextInput
                  className="odh-number-input__hour"
                  name="hour"
                  id="hour-input"
                  type="text"
                  aria-label="Culler Timeout Hour Input"
                  value={hour}
                  isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                  onBlur={() => submitClusterSettings({ pvcSize, cullerTimeout })}
                  onKeyPress={onEnterPress}
                  onChange={(value: string) => {
                    let newValue =
                      isNaN(Number(value)) || !Number.isInteger(Number(value))
                        ? hour
                        : Number(value);
                    newValue =
                      newValue > MAX_HOUR ? MAX_HOUR : newValue < MIN_HOUR ? MIN_HOUR : newValue;
                    // if the hour is max, then the minute can only be set to 0
                    if (newValue === MAX_HOUR && minute !== MIN_MINUTE) {
                      setMinute(MIN_MINUTE);
                    }
                    setHour(newValue);
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>hours</InputGroupText>
                <TextInput
                  className="odh-number-input"
                  name="minute"
                  id="minute-input"
                  type="text"
                  aria-label="Culler Timeout Minute Input"
                  value={minute}
                  isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                  onBlur={() => submitClusterSettings({ pvcSize, cullerTimeout })}
                  onKeyPress={onEnterPress}
                  onChange={(value: string) => {
                    let newValue =
                      isNaN(Number(value)) || !Number.isInteger(Number(value))
                        ? minute
                        : Number(value);
                    newValue =
                      newValue > MAX_MINUTE
                        ? MAX_MINUTE
                        : newValue < MIN_MINUTE
                        ? MIN_MINUTE
                        : newValue;
                    // if the hour is max, then the minute can only be set to 0
                    if (hour === MAX_HOUR) {
                      newValue = MIN_MINUTE;
                    }
                    setMinute(newValue);
                  }}
                />
                <InputGroupText variant={InputGroupTextVariant.plain}>minutes</InputGroupText>
              </InputGroup>
              <HelperText>
                <HelperTextItem
                  variant={cullerTimeout === 0 ? 'error' : 'indeterminate'}
                  hasIcon={cullerTimeout === 0}
                >
                  Note: Notebook culler timeout must be between 1 minute and 1000 hours.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
          </Form>
        </PageSection>
      ) : null}
    </ApplicationsPage>
  );
};

export default ClusterSettings;