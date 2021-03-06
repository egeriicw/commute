import humanizeDuration from 'humanize-duration'
import React, {Component, PropTypes} from 'react'
import {Button, ButtonGroup, Col, ControlLabel, FormGroup, Grid, Panel,
  ProgressBar, Row, Tab, Table, Tabs} from 'react-bootstrap'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table'
import Combobox from 'react-widgets/lib/Combobox'
import Slider from 'rc-slider'

import ButtonLink from './util/button-link'
import BackButton from '../containers/util/back-button'
import Infographic from './site-helpers/infographic'
import SiteMap from './site-helpers/map'
import {AccessTable, RidematchesTable} from './site-helpers/tables'
import FieldGroup from './util/fieldgroup'
import Icon from './util/icon'
import {
  actUponConfirmation,
  arrayCountRenderer,
  capitalize,
  humanizeDistance,
  formatDistance
} from '../utils'
import {pageview} from '../utils/analytics'
import {
  basicStats,
  downloadMatches,
  getSiteOrMultiSiteEntityInfo,
  modeStats,
  ridematches as getRideMatches,
  summaryStats
} from '../utils/data'
import messages from '../utils/messages'

export default class Site extends Component {
  static propTypes = {
    // props
    isMultiSite: PropTypes.bool.isRequired,
    multiSite: PropTypes.object,
    polygonStore: PropTypes.object,
    site: PropTypes.object,
    sites: PropTypes.array,
    siteStore: PropTypes.object,
    commuters: PropTypes.array.isRequired,

    // dispatch
    deleteCommuter: PropTypes.func,
    deleteMainEntity: PropTypes.func.isRequired,
    deletePolygons: PropTypes.func,
    deleteSiteFromMultiSites: PropTypes.func,
    loadCommuters: PropTypes.func.isRequired,
    loadMultiSite: PropTypes.func,
    loadPolygons: PropTypes.func,
    loadSite: PropTypes.func,
    loadSites: PropTypes.func
  }

  componentWillMount () {
    this.state = {
      activeTab: 'summary',
      analysisMode: 'TRANSIT',
      analysisMapStyle: 'blue-solid',
      commuterRingRadius: 1,
      isochroneCutoff: 7200,
      rideMatchMapStyle: 'marker-clusters',
      mapDisplayMode: 'STANDARD' // STANDARD / FULLSCREEN / HIDDEN
    }
    const {isMultiSite} = this.props
    if (isMultiSite) {
      pageview('/multi-site')
    } else {
      pageview('/site')
    }
  }

  _commuterSiteNameRenderer = (cell, row) => {
    const {siteStore} = this.props
    return siteStore[row.siteId].name
  }

  _commuterToolsRenderer = (cell, row) => {
    const {site} = this.props
    return <ButtonGroup>
      <ButtonLink
        bsSize='xsmall'
        bsStyle='warning'
        to={`/site/${site._id}/commuter/${row._id}/edit`}>
        <Icon type='pencil' />Edit
      </ButtonLink>
      <Button
        bsSize='xsmall'
        bsStyle='danger'
        onClick={this._onDeleteCommuterClick.bind(this, row)}>
        <Icon type='trash' /> Delete
      </Button>
    </ButtonGroup>
  }

  _handleAnalysisTimeChange = (value) => {
    this.setState({ isochroneCutoff: value })
  }

  _handleDelete = () => {
    const {
      deleteMainEntity,
      deletePolygons,
      deleteSiteFromMultiSites,
      isMultiSite,
      multiSite,
      multiSites,
      site
    } = this.props
    const doDelete = () => {
      deleteMainEntity(isMultiSite ? multiSite : site)
      if (!isMultiSite) {
        deletePolygons({ siteId: site._id })
        deleteSiteFromMultiSites({ multiSites, siteId: site._id })
      }
    }
    const messageType = isMultiSite ? 'multiSite' : 'site'
    actUponConfirmation(messages[messageType].deleteConfirmation, doDelete)
  }

  _handleRidematchRadiusChange = (value) => {
    this.setState({ commuterRingRadius: value })
  }

  _handleSelectCommuter = (commuter, fromMap) => {
    const newState = { selectedCommuter: commuter }
    if (fromMap) {
      newState.activeTab = 'individual-analysis'
    }
    this.setState(newState)
  }

  _handleStateChange = (name, event) => {
    this.setState({ [name]: event.target.value })
  }

  _handleTabSelect = (selectedTab) => {
    this.setState({ activeTab: selectedTab })
  }

  _setMapDisplayMode = (mapDisplayMode) => {
    this.setState({ mapDisplayMode })
    setTimeout(() => {
      const map = this.refs.map
      if (map) {
        map.resized()
      }
    }, 100)
  }

  _onDeleteCommuterClick (commuter) {
    const doDelete = () => this.props.deleteCommuter(commuter)
    actUponConfirmation(messages.commuter.deleteConfirmation, doDelete)
  }

  _renderHeader (entity, isMultiSite) {
    return (
      <Row>
        <Col xs={12}>
          <h3>
            <Icon type='building' />{' '}
            <span>{entity.name}</span>
            {' '}
            <ButtonGroup style={{ marginLeft: '12px', paddingBottom: '2px' }}>
              <ButtonLink
                bsSize='xsmall'
                bsStyle='warning'
                to={`/${isMultiSite ? 'multi-site' : 'site'}/${entity._id}/edit`}
                >
                <Icon type='pencil' /> Edit
              </ButtonLink>
              <Button
                bsSize='xsmall'
                bsStyle='danger'
                onClick={this._handleDelete}
                >
                <Icon type='trash' /> Delete
              </Button>
            </ButtonGroup>
            <BackButton />
          </h3>
          {!isMultiSite &&
            <p><Icon type='map-marker' /> {entity.address}</p>
          }
        </Col>
      </Row>
    )
  }

  render () {
    const {
      commuters,
      isMultiSite,
      lastCommuterStoreUpdateTime,
      polygonStore,
      multiSite,
      numCommuters,
      site,
      sites,
      siteStore
    } = this.props
    const {
      activeTab,
      analysisMapStyle,
      analysisMode,
      commuterRingRadius,
      isochroneCutoff,
      rideMatchMapStyle,
      selectedCommuter,
      mapDisplayMode
    } = this.state

    const {
      entity,
      errorMessage,
      hasSiteCalculationError
    } = getSiteOrMultiSiteEntityInfo(this.props)

    // make sure data has loaded
    if (
      (isMultiSite &&
        (!multiSite || (multiSite && multiSite.sites.length > sites.length))) ||
      (!isMultiSite && !site)
    ) {
      return null
    }

    if (hasSiteCalculationError) {
      return (
        <Grid>
          {this._renderHeader(entity, isMultiSite)}

          <Row style={{ marginTop: '15px' }}>
            <h4>An error occurred</h4>
            <p>{errorMessage}</p>
          </Row>
        </Grid>
      )
    }

    const hasCommuters = commuters.length > 0
    const loadingCommuters = numCommuters > commuters.length

    const dataArgs = [
      lastCommuterStoreUpdateTime,
      entity._id,
      commuters,
      analysisMode
    ]
    const {
      allCommutersGeocoded,
      allCommutersStatsCalculated,
      pctGeocoded,
      pctStatsCalculated
    } = basicStats(...dataArgs)
    const {
      ridematches,
      ridematchingAggregateTable
    } = getRideMatches(...dataArgs)

    /************************************************************************
     commuter tab stuff
    ************************************************************************/
    let createCommuterButtons
    if (!isMultiSite) {
      createCommuterButtons = (
        <ButtonGroup>
          <ButtonLink
            bsStyle='info'
            to={`/site/${site._id}/commuter/create`}
            >
            Create New Commuter
          </ButtonLink>
          <ButtonLink
            bsStyle='success'
            to={`/site/${site._id}/bulk-add-commuters`}
            >
            Bulk Add Commuters
          </ButtonLink>
        </ButtonGroup>
      )
    }

    /************************************************************************
     analysis tab stuff
    ************************************************************************/

    const analysisSliderStepAndMin = (
      getIsochroneStrategies[analysisMapStyle] === '15-minute isochrones'
    ) ? 900 : 300

    return (
      <Grid>
        {this._renderHeader(entity, isMultiSite)}

        <Row style={{ marginTop: '15px' }}>
          {/***************************
            Content
          ***************************/}
          {!hasCommuters &&
            <Col xs={this.state.mapDisplayMode === 'HIDDEN' ? 12 : 7}>
              {isMultiSite && !loadingCommuters &&
                <p>None of the sites in this Multi-Site Analysis have any commuters!  Add commuters to specific sites.</p>
              }
              {!isMultiSite && !loadingCommuters &&
                <div>
                  <p>This site doesn{`'`}t have any commuters yet!  Add some using one of the options below:</p>
                  {createCommuterButtons}
                </div>
              }
              {loadingCommuters &&
                <div>
                  <p>Loading data...</p>
                </div>
              }
            </Col>
          }
          {hasCommuters &&
            <Col xs={this.state.mapDisplayMode === 'HIDDEN' ? 12 : 7}>
              <Tabs
                activeKey={activeTab}
                id='site-tabs'
                onSelect={this._handleTabSelect}
                >
                {this.state.mapDisplayMode === 'HIDDEN' &&
                  <div style={{ position: 'absolute', right: '15px', top: '0px' }}>
                    <Button bsSize='small' onClick={() => this.setState({ mapDisplayMode: 'STANDARD' })}>
                      <Icon type='map' /> Show Map
                    </Button>
                  </div>
                }
                <Tab eventKey='summary' title={<span><Icon type='info-circle' /> Summary</span>}>
                  {/***************************
                    Summary Tab
                  ***************************/}
                  {!allCommutersGeocoded &&
                    <ProgressBar
                      striped
                      now={Math.max(pctGeocoded, 25)}
                      label='Geocoding Commuters'
                      />
                  }
                  {allCommutersGeocoded && !allCommutersStatsCalculated &&
                    <ProgressBar
                      striped
                      now={Math.max(pctStatsCalculated, 50)}
                      label='Analyzing Commutes'
                      />
                  }
                  {allCommutersGeocoded && allCommutersStatsCalculated &&

                    <Row className='summary-tab'>
                      <Row>
                        <Col xs={12}>
                          <Panel header={(<h3>Printable Report</h3>)}>
                            <Col xs={5}>
                              <ButtonLink
                                bsStyle='primary'
                                bsSize='large'
                                to={isMultiSite
                                  ? `/multi-site/${multiSite._id}/create-report`
                                  : `/site/${site._id}/create-report`}
                                >
                                <Icon type='print' />Printable Report
                              </ButtonLink>
                            </Col>
                            <Col xs={7}>
                              <Icon type='info-circle' /> Click "Printable Report" to view a summary version of this site analysis suitable for sharing with partners.
                            </Col>
                          </Panel>
                        </Col>
                      </Row>
                      <Infographic
                        commuterCount={commuters.length}
                        summaryStats={summaryStats(...dataArgs)}
                        isMultiSite={isMultiSite}
                        />
                    </Row>
                  }
                </Tab>
                {isMultiSite &&
                  <Tab eventKey='sites' title='Sites'>
                    {/***************************
                      Sites Tab
                    ***************************/}
                    <Row>
                      <Col xs={12}>
                        <BootstrapTable data={sites}>
                          <TableHeaderColumn dataField='_id' isKey hidden />
                          <TableHeaderColumn dataField='name'>Name</TableHeaderColumn>
                          <TableHeaderColumn dataField='address'>Address</TableHeaderColumn>
                          <TableHeaderColumn
                            dataField='commuters'
                            dataFormat={arrayCountRenderer}
                            >
                            # of Commuters
                          </TableHeaderColumn>
                        </BootstrapTable>
                      </Col>
                    </Row>
                  </Tab>
                }
                <Tab eventKey='commuters' title={<span><Icon type='users' /> Commuters</span>}>
                  {/***************************
                    Commuters Tab
                  ***************************/}
                  <Row>
                    <Col xs={12}>
                      {!isMultiSite && createCommuterButtons}
                      {!isMultiSite &&
                        <span className='pull-right'>
                          <Table condensed bordered>
                            <tbody>
                              <tr>
                                <td>% of commuters geocoded:</td>
                                <td>{pctGeocoded}</td>
                              </tr>
                              <tr>
                                <td>% of commutes calculated:</td>
                                <td>{pctStatsCalculated}</td>
                              </tr>
                            </tbody>
                          </Table>
                        </span>
                      }
                      {isMultiSite &&
                        <span className='pull-right'>
                          <Table condensed bordered>
                            <tbody>
                              <tr>
                                <td>% of commuters geocoded:</td>
                                <td>{pctGeocoded}</td>
                                <td>% of commutes calculated:</td>
                                <td>{pctStatsCalculated}</td>
                              </tr>
                            </tbody>
                          </Table>
                        </span>
                      }
                      <div style={{ clear: 'both' }}>
                        {isMultiSite &&
                          <BootstrapTable
                            data={commuters}
                            pagination={commuters.length > 10}
                            >
                            <TableHeaderColumn dataField='_id' isKey hidden />
                            <TableHeaderColumn dataField='name'>Name</TableHeaderColumn>
                            <TableHeaderColumn dataField='address'>Address</TableHeaderColumn>
                            <TableHeaderColumn dataFormat={this._commuterSiteNameRenderer}>Site</TableHeaderColumn>
                          </BootstrapTable>
                        }
                        {!isMultiSite &&
                          <BootstrapTable
                            data={commuters}
                            pagination={commuters.length > 10}
                            >
                            <TableHeaderColumn dataField='_id' isKey hidden />
                            <TableHeaderColumn dataField='name'>Name</TableHeaderColumn>
                            <TableHeaderColumn dataField='address'>Address</TableHeaderColumn>
                            <TableHeaderColumn dataFormat={geocodeConfidenceRenderer}>Geocode Accuracy</TableHeaderColumn>
                            <TableHeaderColumn dataFormat={this._commuterToolsRenderer}>Tools</TableHeaderColumn>
                          </BootstrapTable>
                        }
                      </div>
                    </Col>
                  </Row>
                </Tab>
                <Tab eventKey='analysis' title={<span><Icon type='bar-chart' /> Analysis</span>}>
                  {/***************************
                    Analysis Tab
                  ***************************/}
                  <Row>
                    <Col xs={6}>
                      <FieldGroup
                        label='Mode'
                        name='analysisMode'
                        onChange={this._handleStateChange}
                        componentClass='select'
                        value={analysisMode}
                        >
                        <option value='TRANSIT'>Transit</option>
                        <option value='BICYCLE'>Bicycle</option>
                        <option value='WALK'>Walk</option>
                        <option value='CAR'>Carpool</option>
                      </FieldGroup>
                    </Col>
                    {!isMultiSite &&
                      <Col xs={6}>
                        <FieldGroup
                          label='Map Style'
                          name='analysisMapStyle'
                          onChange={this._handleStateChange}
                          componentClass='select'
                          value={analysisMapStyle}
                          >
                          <option value='blue-solid'>Single Color Isochrone</option>
                          <option value='inverted'>Inverted Isochrone</option>
                          <option value='blue-incremental-15-minute'>Blueish Isochrone (15 minute intervals)</option>
                          <option value='blue-incremental'>Blueish Isochrone (5 minute intervals)</option>
                          <option value='green-red-diverging'>Green > Yellow > Orange > Red Isochrone (5 minute intervals)</option>
                        </FieldGroup>
                      </Col>
                    }
                  </Row>
                  <Row>
                    <Col xs={12}>
                      {!isMultiSite &&
                        <Panel>
                          <p><b>Maximum Travel Time</b></p>
                          <Slider
                            defaultValue={7200}
                            handle={
                              <CustomHandle
                                formatter={
                                  // convert minutes to milliseconds
                                  (v) => humanizeDuration(v * 1000, { round: true })
                                }
                                />
                            }
                            max={7200}
                            min={analysisSliderStepAndMin}
                            onChange={this._handleAnalysisTimeChange}
                            step={analysisSliderStepAndMin}
                            />
                        </Panel>
                      }
                    </Col>
                  </Row>
                  <AccessTable
                    analysisModeStats={modeStats(...dataArgs)}
                    mode={analysisMode}
                    />
                </Tab>
                <Tab eventKey='ridematches' title={<span><Icon type='car' /> Matches</span>}>
                  {/***************************
                    Ridematches Tab
                  ***************************/}
                  {!allCommutersGeocoded &&
                    <ProgressBar
                      striped
                      now={pctGeocoded}
                      label='Geocoding Commuters'
                      />
                  }
                  {allCommutersGeocoded &&
                    <div>
                      <FieldGroup
                        label='Map Style'
                        name='rideMatchMapStyle'
                        onChange={this._handleStateChange}
                        componentClass='select'
                        value={rideMatchMapStyle}
                        >
                        <option value='marker-clusters'>Clusters</option>
                        <option value='heatmap'>Heatmap</option>
                        <option value='commuter-rings'>Commuter Rings</option>
                      </FieldGroup>
                      {rideMatchMapStyle === 'commuter-rings' &&
                        <Panel>
                          <p><b>Commuter Ring Size</b></p>
                          <Slider
                            defaultValue={1}
                            handle={
                              <CustomHandle
                                formatter={
                                  // convert minutes to milliseconds
                                  (v) => humanizeDistance(v)
                                }
                                />
                            }
                            max={20}
                            min={0.25}
                            onChange={this._handleRidematchRadiusChange}
                            step={0.25}
                            />
                        </Panel>
                      }
                      <RidematchesTable
                        ridematchingAggregateTable={ridematchingAggregateTable}
                        />
                      <Row>
                        <Col xs={12}>
                          <Panel header={(<h3>Download Match Report</h3>)} className='download-report-panel'>
                            <Col xs={5}>
                              <Button
                                bsStyle='primary'
                                bsSize='large'
                                onClick={() => {
                                  downloadMatches(ridematches)
                                }}
                              >
                                <Icon type='download' /> Download Matches
                              </Button>
                            </Col>
                            <Col xs={7}>
                              <Icon type='info-circle' /> Click "Download Matches" to download a the raw individual ridematch data as a CSV-format spreadsheet.
                            </Col>
                          </Panel>
                        </Col>
                      </Row>
                    </div>
                  }
                </Tab>
                <Tab eventKey='individual-analysis' title={<span><Icon type='user' /> Profiles</span>}>
                  {/***************************
                    Individual Analysis Tab
                  ***************************/}
                  <FormGroup
                    controlId={`individual-commuter-name`}
                    >
                    <ControlLabel>Commuter</ControlLabel>
                    <Combobox
                      data={commuters}
                      onChange={this._handleSelectCommuter}
                      placeholder='Select a commuter'
                      suggest
                      textField='name'
                      value={selectedCommuter}
                      valueField='_id'
                      />
                  </FormGroup>
                  {selectedCommuter &&
                    <Button onClick={() => this._handleSelectCommuter()}>
                      <Icon type='close' />
                      <span>Deselect commuter</span>
                    </Button>
                  }
                  {selectedCommuter &&
                    <Row>
                      <Col xs={12}>
                        <h4>{selectedCommuter.name}</h4>
                      </Col>
                      <Col xs={12} sm={6}>
                        <h5>Location</h5>
                        <table className='table table-bordered'>
                          <tbody>
                            {isMultiSite &&
                              <tr key='selectedCommuterTableSiteRow'>
                                <td>Site</td>
                                <td>{siteStore[selectedCommuter.siteId].name}</td>
                              </tr>
                            }
                            <tr key='selectedCommuterTableOriginalAddressRow'>
                              <td>Original Address</td>
                              <td>{selectedCommuter['originalAddress']}</td>
                            </tr>
                            {['address', 'neighborhood', 'city', 'county', 'state']
                              .map((field) => (
                                <tr key={`selectedCommuterTable${field}Row`}>
                                  <td>{capitalize(field)}</td>
                                  <td>{selectedCommuter[field]}</td>
                                </tr>
                              ))
                            }
                            <tr key='selectedCommuterTableGeocodeConfidenceRow'>
                              <td>Geocode Accuracy</td>
                              <td>{geocodeConfidenceRenderer(null, selectedCommuter)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </Col>
                      <Col xs={12} sm={6}>
                        <h5>Commuting Options</h5>
                        <table className='table table-bordered'>
                          <tbody>
                            {['bicycle', 'car', 'transit', 'walk']
                              .map((mode) => (
                                <tr key={`selectedCommuterTable${mode}Row`}>
                                  <td>{capitalize(mode)}</td>
                                  <td>
                                    {
                                      getTravelTime(selectedCommuter.modeStats[mode.toUpperCase()]) +
                                      (mode === 'car' ? ' (without traffic)' : '')
                                    }
                                  </td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </Col>
                      <Col xs={12} sm={6}>
                        <h5>Ridematches</h5>
                        {!ridematches[selectedCommuter._id] &&
                          <p>No ridematches within 5 miles of this commuter</p>
                        }
                        {ridematches[selectedCommuter._id] &&
                          <div>
                            <p>{`${ridematches[selectedCommuter._id].matches.length} total matches`}</p>
                            <BootstrapTable
                              data={ridematches[selectedCommuter._id].matches
                                .map((match) => {
                                  return {
                                    distance: match.distance,
                                    id: match.commuter._id,
                                    name: match.commuter.name
                                  }
                                })}
                              options={{
                                defaultSortName: 'distance',
                                defaultSortOrder: 'asc'
                              }}
                              pagination={ridematches[selectedCommuter._id].matches.length > 10}
                              >
                              <TableHeaderColumn dataField='id' isKey hidden />
                              <TableHeaderColumn dataField='name' dataSort>Matched Commuter</TableHeaderColumn>
                              <TableHeaderColumn
                                dataField='distance'
                                dataFormat={formatDistance}
                                dataSort
                                >
                                Distance Between Commuters
                              </TableHeaderColumn>
                            </BootstrapTable>
                          </div>
                        }
                      </Col>
                    </Row>
                  }
                </Tab>
              </Tabs>
            </Col>
          }
          {/***************************
            Map
          ***************************/}
          {this.state.mapDisplayMode !== 'HIDDEN' &&
            <Col xs={5}>
              <div style={this.state.mapDisplayMode === 'FULLSCREEN' ? {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
              } : {height: '600px', marginTop: '1em', marginBottom: '1em'}}
                >
                <SiteMap
                  activeTab={activeTab}
                  analysisMapStyle={analysisMapStyle}
                  analysisMode={analysisMode}
                  commuterRingRadius={commuterRingRadius}
                  commuters={commuters}
                  enableMapDisplayControls
                  handleSelectCommuter={this._handleSelectCommuter}
                  isMultiSite={isMultiSite}
                  isochroneCutoff={isochroneCutoff}
                  mapDisplayMode={mapDisplayMode}
                  polygonStore={polygonStore}
                  ref='map'
                  rideMatchMapStyle={rideMatchMapStyle}
                  selectedCommuter={selectedCommuter}
                  setMapDisplayMode={this._setMapDisplayMode}
                  site={site}
                  sites={sites}
                />
              </div>
            </Col>
          }
        </Row>
      </Grid>
    )
  }
}

function CustomHandle (props) {
  const style = Object.assign({ left: `${props.offset}%` }, handleStyle)
  return (
    <div style={style}>{props.formatter(props.value)}</div>
  )
}

CustomHandle.propTypes = {
  formatter: PropTypes.func.isRequired,
  offset: PropTypes.number,
  value: PropTypes.any
}

function geocodeConfidenceRenderer (cell, row) {
  const {geocodeConfidence} = row
  if (geocodeConfidence === -1) {
    return 'calculating...'
  } else if (geocodeConfidence >= 0.8) {
    return 'Good'
  } else {
    return 'Not exact'
  }
}

const getIsochroneStrategies = {
  'blue-incremental': '5-minute isochrones',
  'blue-incremental-15-minute': '15-minute isochrones',
  'blue-solid': 'single isochrone',
  'green-red-diverging': '5-minute isochrones',
  'inverted': 'inverted isochrone'
}

function getTravelTime (mode) {
  if (!mode || !mode.travelTime || mode.travelTime === -1 || mode.travelTime > 7200) {
    return 'N/A'
  } else {
    return humanizeDuration(mode.travelTime * 1000)
  }
}

const handleStyle = {
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  cursor: 'pointer',
  padding: '2px',
  border: '2px solid #abe2fb',
  borderRadius: '3px',
  background: '#fff',
  fontSize: '14px',
  textAlign: 'center'
}
