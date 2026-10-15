/**
 * Content model shared by the public site and the admin editor.
 * Everything the site renders lives in content.json and is editable from /admin.
 */

export type ImagePath = string;

/** Section headings render as `{text} <span>{accent}</span> {suffix}` — empty `accent` means no highlighted part. */
export type Heading = {
  text: string;
  accent: string;
  suffix?: string;
};

export type Stat = {
  value: number;
  decimals: number;
  suffix: string;
  label: string;
};

export type AboutSegment = {
  text: string;
  accent?: boolean;
};

export type Project = {
  title: string;
  description: string;
  image: ImagePath;
  liveUrl: string;
  figmaUrl: string;
  dialogIntro: string;
  focus: string;
  discipline: string;
};

export type Service = {
  title: string;
  description: string;
  tags: string[];
  /** The two showcase images shown in the expanded service card. */
  imageLeft: ImagePath;
  imageRight: ImagePath;
};

export type LatestWork = {
  src: ImagePath;
  alt: string;
  title: string;
  subtitle: string;
};

export type ApproachStep = {
  title: string;
  image: ImagePath;
  description: string;
};

export type ExperienceItem = {
  company: string;
  role: string;
  dates: string;
  location: string;
  /** Color theme class from globals.css — presentational, but editable. */
  className: string;
  responsibilities: string[][];
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar: ImagePath;
  position: string;
};

export type NavLink = {
  label: string;
  href: string;
};

export type WorkAlign = 'l' | 'r' | 'c';

/** A project card on the dedicated /work page. */
export type WorkProject = {
  title: string;
  description: string;
  /** Image URL; leave blank to use the built-in procedural artwork. */
  image: ImagePath;
  /** External "live" link, or blank for a disabled link. */
  liveUrl: string;
  /** External Figma link, or blank for a disabled link. */
  figmaUrl: string;
  align: WorkAlign;
  /** Card width, in vw. */
  width: number;
  /** Procedural artwork key used when `image` is blank. */
  art: string;
};

/** Content for the dedicated /work page (the "all projects" page). */
export type WorkContent = {
  brandName: string;
  heroTitle: string;
  heroLogoDim: ImagePath;
  heroLogoFill: ImagePath;
  heroLogoAlt: string;
  liveLinkLabel: string;
  figmaLinkLabel: string;
  projects: WorkProject[];
};

/** A card image in the homepage 3D helix ribbon. */
export type HelixItem = {
  /** Image URL; leave blank to keep the built-in procedural artwork. */
  image: ImagePath;
};

export type SiteContent = {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    greeting: string;
    nameLines: string[];
    portrait: ImagePath;
    portraitAlt: string;
    portraitCaption: string;
    description: string;
    ctaLabel: string;
    title: string;
    disciplines: string[];
    reel: {
      poster: ImagePath;
      posterAlt: string;
      videoUrl: string;
      videoPageUrl: string;
      playLabel: string;
      pauseLabel: string;
    };
  };
  about: {
    heading: Heading;
    segments: AboutSegment[];
    posters: ImagePath[];
    planeWidth: number;
    planeHeight: number;
    stats: Stat[];
    face: ImagePath;
    faceHover: ImagePath;
  };
  featured: {
    eyebrow: string;
    heading: Heading;
    viewAllLabel: string;
    liveLinkLabel: string;
    figmaLinkLabel: string;
    dialogEyebrowPrefix: string;
    dialogDownloadLabel: string;
    behanceUrl: string;
    behanceLabel: string;
    projects: Project[];
  };
  services: {
    eyebrow: string;
    heading: Heading;
    callLabel: string;
    items: Service[];
  };
  stories: {
    mobileTitleTop: string;
    mobileTitleBottom: string;
    captionEyebrow: string;
    captionTitle: string;
    captionText: string;
    videoUrl: string;
    poster: ImagePath;
  };
  latest: {
    heading: Heading;
    items: LatestWork[];
  };
  helix: {
    items: HelixItem[];
  };
  work: WorkContent;
  approach: {
    heading: Heading;
    steps: ApproachStep[];
  };
  experience: {
    heading: Heading;
    items: ExperienceItem[];
  };
  testimonials: {
    heading: Heading;
    eyebrow: string;
    items: Testimonial[];
  };
  footer: {
    backgroundImage: ImagePath;
    name: string;
    blurb: string;
    marqueeText: string;
    marqueeSymbol: string;
    cursorLabel: string;
    sayHelloLabel: string;
    whatsappUrl: string;
    email: string;
    servicesHeading: string;
    askAiLabel: string;
  };
  navigation: NavLink[];
};
