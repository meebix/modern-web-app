export const registerUserFragment = `
  {
    id
    firstName
    email
    role {
      name
      permissions {
        key
      }
      prohibitedRoutes
    }
    userAccount {
      confirmedCode
    }
  }
`;

export const loginUserFragment = `
  {
    id
    password
    role {
      name
      permissions {
        key
      }
      prohibitedRoutes
    }
    userAccount {
      id
      loginAttempts
    }
  }
`;

export const userSecurityQuestionAnswersFragment = `
  {
    id
    userSecurityQuestion {
      id
      shortName
      question
    }
  }
`;

export const verifyUserSecurityQuestionAnswersFragment = `
  {
    email
    userAccount {
      id
      securityQuestionAttempts
    }
  }
`;

export const accountLockedFragment = `
  {
    firstName
    email
    userAccount {
      locked
      lockedCode
    }
  }
`;

export const validateAccessFragment = `
  {
    id
    role {
      name
      permissions {
        key
      }
      prohibitedRoutes
    }
    userAccount {
      refreshToken
    }
  }
`;
