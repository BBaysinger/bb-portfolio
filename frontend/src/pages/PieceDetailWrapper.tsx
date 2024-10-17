import { useParams, useNavigate } from "react-router-dom";

import PieceDetail from "./PieceDetail";

interface PieceDetailWrapperProps {
  pieceId: string;
}

const PieceDetailWrapper: React.FC<PieceDetailWrapperProps> = () => {
  const navigate = useNavigate();
  const params = useParams();
  const pieceId = params.pieceId ? params.pieceId : "";
  return <PieceDetail navigate={navigate} pieceId={pieceId} />;
};

export default PieceDetailWrapper;
