import codes from 'cypress/fixtures/codes.json';
import inviter from 'cypress/fixtures/inviter.json';
import user from 'cypress/fixtures/user.json';

describe('Index PG', () => {
  it('redirects to /join when logged out', () => {
    cy.visit('/');
    cy.url().should('eq', 'http://localhost:3000/join');
  });

  it('redirects to /join for users w/out an invite', () => {
    cy.task('seed', { skipUser: true, skipCodes: true });
    cy.login(user);
    cy.visit('/');
    cy.url().should('eq', 'http://localhost:3000/join');
  });

  it('redirects to /join for users w/ invalid invite', () => {
    cy.intercept('PATCH', `${Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string}/rest/v1/codes?id=eq.${codes[0].id}`).as('use-code');
    cy.task('seed', { skipUser: true, skipCode: true });
    cy.login(user);
    cy.visit(`/?code=${codes[0].id}`);
    cy.wait('@use-code').its('response.statusCode').should('eq', 404);
    cy.url().should('contain', '/join').and('contain', `code=${codes[0].id}`);
  });

  it('collects phone for invite codes', () => {
    cy.intercept('POST', '/api/users').as('create-user');
    cy.task('seed', { skipUser: true });
    cy.login(user);
    cy.visit('/');
    cy.percySnapshot('Index Form');
    cy.get('input[placeholder="phone number"]')
      .as('phone-input')
      .type(`${user.phone.substring(0, 3)}{enter}`)
      .should('have.value', user.phone.substring(0, 3))
      .and('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.percySnapshot('Index Form Loading');
    cy.wait('@create-user').its('response.statusCode').should('eq', 400);
    cy.get('@phone-input').should('have.class', 'error');
    cy.percySnapshot('Index Form Error');
    cy.get('@phone-input')
      .type(`${user.phone.substring(3)}`)
      .should('have.value', user.phone);
    cy.contains('button', 'get codes')
      .click()
      .should('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.wait('@create-user').its('response.statusCode').should('eq', 201);
    cy.get('@phone-input').should('not.exist');
    cy.percySnapshot('Index No Form');
  });

  it('prevents duplicate phones', () => {
    cy.intercept('POST', '/api/users').as('create-user');
    cy.task('seed', { skipUser: true });
    cy.login(user);
    cy.visit('/');
    cy.get('input[placeholder="phone number"]')
      .as('phone-input')
      .type(`${inviter.phone}{enter}`)
      .should('have.value', inviter.phone)
      .and('be.disabled')
      .and('have.css', 'cursor', 'wait')
      .loading();
    cy.wait('@create-user').its('response.statusCode').should('eq', 500);
    cy.get('@phone-input').should('have.class', 'error');
  });

  it('filters tests by course', () => {
    cy.task('seed');
    cy.login(user);
    cy.visit('/?c=apc', {
      onBeforeLoad(win: Window) {
        win.localStorage.setItem('theme', 'light');
      },
    });
    cy.get('input[placeholder="phone number"]').should('not.exist');
    cy.contains('no contributions to show').should('be.visible');
    cy.percySnapshot('Index Empty');
    cy.get('select[aria-label="School"]')
      .should('have.value', 'gunn')
      .and('be.disabled')
      .and('have.css', 'cursor', 'not-allowed');
    cy.get('select[aria-label="Course"]')
      .should('have.value', 'apc')
      .select('ap-calc-bc');
    cy.url().should('contain', 'c=ap-calc-bc');
    cy.contains('no contributions to show').should('not.exist');
    cy.percySnapshot('Index Test');
    cy.get('select[aria-label="Theme"]')
      .as('theme-select')  
      .should('have.value', 'light')
      .select('dark');
    cy.percySnapshot('Index Dark');
    cy.get('@theme-select').select('light');
    cy.percySnapshot('Index Light');
    cy.get('@theme-select').select('system');
  });

  it('shows fallback during login', () => {
    cy.task('seed', { skipUser: true, skipCode: true });
    cy.visit(`/#access_token=l0R3m_1psUm-d035Nt_w0rK?code=${codes[1].id}`);
    cy.get('p.loading').should('be.visible');
    cy.get('h2.loading').should('be.visible');
    cy.percySnapshot('Index Fallback');
  });

  it('uses invite codes after login', () => {
    cy.intercept('PATCH', `${Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string}/rest/v1/codes?id=eq.${codes[2].id}`).as('use-code');
    cy.task('seed', { skipUser: true, skipCode: true });
    cy.login(user);
    cy.visit(`/?c=apc&code=${codes[2].id}`);
    cy.get('p.loading').should('be.visible');
    cy.get('h2.loading').should('be.visible');
    cy.wait('@use-code');
    cy.contains('no contributions to show').should('be.visible');
    cy.get('.loading').should('not.exist');
  });

  it('reuses codes by email address', () => {
    cy.intercept('PATCH', `${Cypress.env().NEXT_PUBLIC_SUPABASE_URL as string}/rest/v1/codes?id=eq.${codes[1].id}`).as('use-code');
    cy.task('seed', { skipUser: true, skipCode: true });
    cy.login(user);
    cy.visit(`/?c=apc&code=${codes[1].id}`);
    cy.get('p.loading').should('be.visible');
    cy.get('h2.loading').should('be.visible');
    cy.wait('@use-code').its('response.statusCode').should('eq', 404);
    cy.url().should('contain', `/join?c=apc&code=${codes[1].id}`);
    cy.get('p.error').should('be.visible').and('contain', 'used was invalid');
    cy.percySnapshot('Join Code Error');
  });
});
