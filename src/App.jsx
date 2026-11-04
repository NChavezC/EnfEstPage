import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import BeforeAfter from "./pages/BeforeAfter";
import Payment from "./pages/Payment";
import PaymentResult from "./pages/PaymentResult";
import AppLayout from "./ui/AppLayout";
import PaymentCancelled from "./pages/PaymentCancelled";
import Catalog from "./pages/Catalog";
import PageNotFound from "./pages/PageNotFound";

import Booking from "./pages/Booking";
import BookingResult from "./pages/BookingResult";
import AgendaAdmin from "./pages/AgendaAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate replace to="home" />} />
          <Route path="home" element={<Home />} />
          <Route path="contact" element={<Contact />} />
          <Route path="before-after" element={<BeforeAfter />} />
          <Route path="catalogo" element={<Catalog />} />
          <Route path="reservar" element={<Booking />} />
          <Route path="reservar/resultado" element={<BookingResult />} />
          <Route path="admin/*" element={<AgendaAdmin />} />
          <Route path="pago" element={<Payment />} />
          <Route path="pago/resultado" element={<PaymentResult />} />
          <Route path="pago/cancelado" element={<PaymentCancelled />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
