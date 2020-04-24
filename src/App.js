import React,{Fragment,useEffect} from 'react';
import logo from "./logo.svg";
import "./App.css";
import { BrowserRouter, Switch, Route, Link, withRouter } from "react-router-dom";
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import Main from "./Main";

const theme = createMuiTheme({
  palette: {
    primary: {
        main: "#57a5ff"
      }
    }
  },
)

function ScrollToTop({ history, children }) {
  useEffect(() => {
    const unlisten = history.listen(() => {
      window.scrollTo(0, 0);
    });
    return () => {
      unlisten();
    }
  }, []);

  return <Fragment>{children}</Fragment>;
}

const ScrollToTopWithRouter = withRouter(ScrollToTop);

const App = () => (
  <MuiThemeProvider theme = {theme}>
  <BrowserRouter className = "container">
    <ScrollToTopWithRouter>
   <Main/>
   </ScrollToTopWithRouter>
  </BrowserRouter>
</MuiThemeProvider>
);

export default App;
