import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/controls';
import { Title } from '@/ui/display';
import { ImageSlot } from '@/ui/ImageSlot';
import { useApp } from '@/store/app';
import s from './auth.module.css';

/** Splash: auto-advances after 1.8s (or on tap). */
export function Splash() {
  const navigate = useNavigate();
  const signedIn = useApp((st) => st.signedIn);
  const onboarded = useApp((st) => st.onboarded);
  const next = signedIn ? '/feed' : onboarded ? '/entrar' : '/onboarding';

  useEffect(() => {
    const t = setTimeout(() => navigate(next, { replace: true }), 1800);
    return () => clearTimeout(t);
  }, [navigate, next]);

  return (
    <button type="button" className={s.splash} onClick={() => navigate(next, { replace: true })} aria-label="Continuar">
      <ImageSlot id="splash" placeholder="Grid de largada / autódromo à noite" editable={false} />
      <div className={s.splashShade} />
      <div className={s.splashContent}>
        <div className={s.logo}>
          <Icon name="flag-checkered" />
        </div>
        <span className="fs-display" style={{ fontSize: 64, lineHeight: 0.9, letterSpacing: '.02em' }}>
          Fast
          <br />
          Street
        </span>
        <span style={{ fontSize: 15, color: 'var(--fs-text-body)' }}>Eventos legalizados em locais autorizados.</span>
        <div className={s.speedLine} />
      </div>
    </button>
  );
}

const SLIDES = [
  { img: 'Carro nos boxes', title: 'Sua garagem virtual', text: 'Cadastre seus carros com fotos e especificações e escolha o principal para se inscrever em eventos.' },
  { img: 'Vista aérea do autódromo', title: 'Eventos no mapa', text: 'Track days, arrancadas autorizadas e encontros em autódromos e áreas privadas perto de você.' },
  { img: 'Pódio / pit lane', title: 'Suba no ranking', text: 'Resultados publicados pelos organizadores viram pontos, pódios e conquistas.' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const setOnboarded = useApp((st) => st.setOnboarded);
  const [slide, setSlide] = useState(0);
  const last = slide === SLIDES.length - 1;
  const cur = SLIDES[slide];

  const toSignup = () => {
    setOnboarded();
    navigate('/cadastro');
  };

  return (
    <section className={s.carousel} aria-roledescription="carrossel">
      <div className={s.carouselMedia}>
        <ImageSlot key={slide} id={`onboarding-${slide + 1}`} placeholder={cur.img} />
        <div className={s.carouselFade} />
        <button type="button" className={s.skip} onClick={toSignup}>
          Pular
        </button>
      </div>
      <div className={s.slideText} aria-live="polite">
        <span className="fs-overline" style={{ fontSize: 13 }}>
          0{slide + 1} / 03
        </span>
        <Title size={40}>{cur.title}</Title>
        <p style={{ fontSize: 15, lineHeight: 1.55 }} className="fs-muted">
          {cur.text}
        </p>
        <div className={s.dots}>
          {SLIDES.map((_, i) => (
            <button key={i} type="button" className={s.dot} aria-label={`Slide ${i + 1}`} aria-current={i === slide} onClick={() => setSlide(i)} />
          ))}
        </div>
      </div>
      <div style={{ flex: '1 0 0' }} />
      <div className={s.actions}>
        <Button size="lg" onClick={() => (last ? toSignup() : setSlide(slide + 1))}>
          {last ? 'Criar conta' : 'Próximo'}
        </Button>
        <Button
          variant="plain"
          size="md"
          onClick={() => {
            setOnboarded();
            navigate('/entrar');
          }}
        >
          Já tenho conta
        </Button>
      </div>
    </section>
  );
}
