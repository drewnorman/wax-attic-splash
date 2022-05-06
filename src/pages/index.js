import { createGlobalStyle } from 'styled-components';
import dynamic from 'next/dynamic';
import BaseLayout from '../layouts/BaseLayout';

const GlobalStyle = createGlobalStyle`
  html {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 19px;
  }
  h1, h2, h3 {
    font-family: ${({ theme }) => theme.fonts.largeHeading}
  }
  h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.smallHeading};
  }
  a, a:visited, a:active {
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
  }
  a:hover, a:focus {
      opacity: 0.7;
  }
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.black};
    text-align: center;
  }
  canvas {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  #game, #loadingOverlay {
      position: fixed;
      top: 0;
      left: 0;
  }

  #loadingOverlay {
      background-color: #323232;
      width: 100%;
      height: 100%;
  }

  #loadingIndicator {
      position: fixed;
      top: 50%;
      left: 0;
      width: 100%;
  }

  #enterSite {
      position: fixed;
      width: 100%;
      top: 15%;
      left: 0;
  }
  @media screen and ${({ theme }) => theme.breakpoints.large} {
    #enterSite {
        top: 10%;
    }
  }
`;

const GameContainerNoSSR = dynamic(
  () => import('../components/game/GameContainer'),
  {
    ssr: false,
  },
);

const Home = () => (
  <BaseLayout
    title="Wax Attic"
    description="A unique clothing collection inspired by natural selection"
  >
    <>
      <GlobalStyle />
      <GameContainerNoSSR />
    </>
  </BaseLayout>
);

export default Home;
