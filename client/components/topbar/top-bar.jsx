import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import { createContainer } from 'meteor/react-meteor-data';

TopBar = class TopBar extends Component {

  _socialButton(socialApp) {
    return (
      <a className="item" href={Meteor.settings.public.social[socialApp]} target="_blank" key={`${socialApp}-btn`}>
        <i className={`large ${socialApp} ${socialApp}-color icon`}></i>
        {`${socialApp[0].toUpperCase()}${socialApp.substring(1)}`}
      </a>
    );
  }

  _renderSocialButtons() {
    const socialApps = Object.keys(Meteor.settings.public.social);
    return socialApps.map((app) => this._socialButton(app));
  }

  _logInLogOutBtn() {
    if (this.props.user) {
      return (
        <a className="item" onClick={this._logout}>
          <i className="sign out icon"></i>
          Leave
        </a>
      );
    } else {
      return (
        <a className="item" href="/login">
          <i className="sign in icon"></i>
          Enter
        </a>
      );
    }
  }

  _logout(event) {
    event.preventDefault();
    return Meteor.logout(() => FlowRouter.go('/'));
  }

  _initDropDownMenus() {
    $(this.refs.topbar).find('.ui.dropdown').dropdown();
  }

  componentDidMount() {
    this._initDropDownMenus();
  }

  componentDidUpdate(prevProps, prevState) {
    this._initDropDownMenus();
  }

  render() {
    return (
      <div className="ui fixed inverted labeled icon menu top-bar" ref="topbar">

        <div className="ui dropdown item" ref="menuDropdown">
          <i className="large content icon"></i>
          Menu
          <div className="menu topbar-dropdown-menu">
            <a className="item" href="/">
              <i className="green home icon"></i>
              Home
            </a>
            <a className="item" href="/gallery">
              <i className="blue camera icon"></i>
              Gallery
            </a>
            <a className="item" href="/contact">
              <i className="violet mail icon"></i>
              Contact
            </a>
            <a className="item" href="/puzzles">
              <i className="red puzzle icon"></i>
              Puzzles
            </a>
            <a className="item" href="/info">
              <i className="orange circle info icon"></i>
              More Info
            </a>
            <a className="item" href="/qrcode">
              <i className="gray qrcode icon"></i>
              QR Encoder
            </a>
          </div>
        </div>

        <div className="right menu">
          {this._logInLogOutBtn()}
        </div>
      </div>
    );
  }
}

TopBar = createContainer(({ params }) => {
  return {
    user: Meteor.user(),
    isAdmin() {
      return Boolean(Meteor.user()) && Meteor.user().hasRole('admin');
    }
  };
}, TopBar);
