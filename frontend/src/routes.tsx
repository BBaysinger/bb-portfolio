import PortfolioList from "pages/PortfolioList";
import PieceDetailWrapper from "pages/PieceDetailWrapper";
import CurriculumVitae from "pages/CurriculumVitae";
import WhoAmI from "pages/WhoAmI";

const routes = [
  {
    path: "/",
    element: <PortfolioList />, // Main portfolio list
    children: [
      {
        path: "portfolio",
        element: <PortfolioList />,
      },
      {
        path: "portfolio/:pieceId",
        element: <PieceDetailWrapper pieceId="someId" />, // Dynamically handle pieceId
      },
      {
        path: "cv",
        element: <CurriculumVitae />,
      },
      {
        path: "whoami",
        element: <WhoAmI />,
      },
    ],
  },
];

export default routes;
