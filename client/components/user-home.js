import React, {Component, PropTypes} from 'react'
import {Button, ButtonGroup, Col, Grid, Row, Jumbotron} from 'react-bootstrap'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table'
import {Link} from 'react-router'

import ButtonLink from './util/button-link'
import Icon from './util/icon'
import HelpPopover from './util/help-popover'
import {actUponConfirmation, arrayCountRenderer} from '../utils'
import {pageview} from '../utils/analytics'
import messages from '../utils/messages'

export default class UserHome extends Component {
  static propTypes = {
    // dispatch
    deleteMultiSite: PropTypes.func.isRequired,
    deletePolygons: PropTypes.func.isRequired,
    deleteSite: PropTypes.func.isRequired,
    deleteSiteFromMultiSites: PropTypes.func.isRequired,
    loadMultiSites: PropTypes.func.isRequired,
    loadSites: PropTypes.func.isRequired,

    // props
    multiSites: PropTypes.array.isRequired,
    sites: PropTypes.array.isRequired
  }

  componentWillMount () {
    this.props.loadSites()
    this.props.loadMultiSites()
    pageview('/')
  }

  _onDeleteMultiSiteClick (multiSite) {
    const doDelete = () => { this.props.deleteMultiSite(multiSite) }
    actUponConfirmation(messages.multiSite.deleteConfirmation, doDelete)
  }

  _onDeleteSiteClick (site) {
    const {deletePolygons, deleteSite, deleteSiteFromMultiSites, multiSites} = this.props
    const doDelete = () => {
      deleteSite(site)
      deletePolygons({ siteId: site._id })
      // remove site from multiSites
      deleteSiteFromMultiSites({ multiSites, siteId: site._id })
    }
    actUponConfirmation(messages.site.deleteConfirmation, doDelete)
  }

  _multiSiteToolsRenderer = (cell, row) => {
    return <ButtonGroup>
      <Button bsSize='xsmall' bsStyle='danger' onClick={this._onDeleteMultiSiteClick.bind(this, row)}>
        <Icon type='trash' /> Delete
      </Button>
    </ButtonGroup>
  }

  _siteToolsRenderer = (cell, row) => {
    return <ButtonGroup>
      <Button bsSize='xsmall' bsStyle='danger' onClick={this._onDeleteSiteClick.bind(this, row)}>
        <Icon type='trash' /> Delete
      </Button>
    </ButtonGroup>
  }

  render () {
    const {sites, multiSites} = this.props
    return (
      <Grid>
        <Jumbotron className='welcome-box'>
          <Row>
            <Col xs={8}>
              <h2>{messages.docs.welcome.title}</h2>
              <p>{messages.docs.welcome.body}</p>
              <Button href={messages.docs.welcome.url} bsStyle='primary' bsSize='large'><Icon type='question-circle' />View Online Documentation</Button>
            </Col>
            <Col xs={4}>
              <div className='welcome-image' />
            </Col>
          </Row>
        </Jumbotron>
        <Row>
          <Col xs={12}>
            <h2><Icon type='building' /> Sites <HelpPopover type='siteOverview' />
              <ButtonLink
                bsStyle='success'
                className='pull-right'
                to='/site/create'
                >
                <span><Icon type='plus' /> Create a new site</span>
              </ButtonLink>
            </h2>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <BootstrapTable data={sites.sort((a, b) => a.name > b.name)}>
              <TableHeaderColumn dataField='_id' isKey hidden />
              <TableHeaderColumn dataField='name' dataFormat={siteNameRenderer}>Name</TableHeaderColumn>
              <TableHeaderColumn dataField='address'>Address</TableHeaderColumn>
              <TableHeaderColumn dataField='commuters' dataFormat={arrayCountRenderer}># of Commuters</TableHeaderColumn>
              <TableHeaderColumn dataFormat={this._siteToolsRenderer}>Tools</TableHeaderColumn>
            </BootstrapTable>
          </Col>
        </Row>
        <Row className='new-section'>
          <Col xs={12}>
            <h2><Icon type='clone' /> Multi-site Analyses <HelpPopover type='multisiteOverview' />
              <ButtonLink
                bsStyle='success'
                className='pull-right'
                to='/multi-site/create'
                >
                <span><Icon type='plus' /> Create a new Multi-Site Analysis</span>
              </ButtonLink>
            </h2>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <BootstrapTable data={multiSites.sort((a, b) => a.name > b.name)}>
              <TableHeaderColumn dataField='_id' isKey hidden />
              <TableHeaderColumn dataField='name' dataFormat={multiSiteNameRenderer}>Name</TableHeaderColumn>
              <TableHeaderColumn dataField='sites' dataFormat={arrayCountRenderer}># of Sites</TableHeaderColumn>
              <TableHeaderColumn dataFormat={this._multiSiteToolsRenderer}>Tools</TableHeaderColumn>
            </BootstrapTable>
          </Col>
        </Row>
      </Grid>
    )
  }
}

function multiSiteNameRenderer (cell, row) {
  return <span>
    <Icon type='clone' />{' '}
    <Link to={`/multi-site/${row._id}`}><strong>{cell}</strong></Link>
  </span>
}

function siteNameRenderer (cell, row) {
  return <span>
    <Icon type='building' />{' '}
    <Link to={`/site/${row._id}`}><strong>{cell}</strong></Link>
  </span>
}
