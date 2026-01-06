// RedirectPage
// Purpose: Entry point that redirects to /learn

import { Navigate } from 'react-router-dom';

const RedirectPage = () => {
  return <Navigate to="/learn" replace />;
};

export default RedirectPage;
