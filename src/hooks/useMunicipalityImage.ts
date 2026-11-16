import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  fetchMunicipalityWikipediaData,
  getCachedMunicipalityWikiData,
  type MunicipalityWikiData
} from '../services/municipalityImages';

export interface UseMunicipalityImageParams {
  municipalityId: string;
  municipalityName: string;
  departmentName: string;
  userPhotoUrl?: string | null;
  curatedDescription?: string | null;
  /** @deprecated Ignored intentionally: curated Unsplash photos are no longer used. */
  curatedCoverPhoto?: string | null;
  disabled?: boolean;
}

export interface UseMunicipalityImageResult {
  ref: RefObject<HTMLDivElement | null>;
  imageUrl: string | null;
  description: string;
  isLoading: boolean;
  isDescriptionLoading: boolean;
  onImageError: () => void;
}

function getValidCuratedDescription(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('Municipio histórico y patrimonio cultural del departamento de')) {
    return null;
  }
  return trimmed;
}

export function useMunicipalityImage({
  municipalityId,
  municipalityName,
  departmentName,
  userPhotoUrl,
  curatedDescription,
  disabled = false
}: UseMunicipalityImageParams): UseMunicipalityImageResult {
  const ref = useRef<HTMLDivElement | null>(null);

  const directUserUrl =
    typeof userPhotoUrl === 'string' && userPhotoUrl.trim().length > 0
      ? userPhotoUrl.trim()
      : null;

  const validCuratedDesc = getValidCuratedDescription(curatedDescription);
  const needsWikiFetch = !disabled && (!directUserUrl || !validCuratedDesc);

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [wikiData, setWikiData] = useState<MunicipalityWikiData>(() => {
    const cached = getCachedMunicipalityWikiData(municipalityId, municipalityName, departmentName);
    return cached ?? { imageUrl: null, extract: null };
  });
  const [isFetchingWiki, setIsFetchingWiki] = useState<boolean>(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // Observe card visibility before querying Wikipedia
  useEffect(() => {
    if (!needsWikiFetch || isVisible) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [needsWikiFetch, isVisible]);

  // Reset state and hydrate from cache when municipality identity changes
  useEffect(() => {
    setFailedUrl(null);

    const cached = getCachedMunicipalityWikiData(municipalityId, municipalityName, departmentName);
    if (cached !== undefined) {
      setWikiData(cached);
      setIsFetchingWiki(false);
      return;
    }

    setWikiData({ imageUrl: null, extract: null });
    if (!needsWikiFetch) {
      setIsFetchingWiki(false);
    }
  }, [municipalityId, municipalityName, departmentName, needsWikiFetch]);

  // Single Wikipedia call once visible if either image or description needs Wikipedia data
  useEffect(() => {
    if (!needsWikiFetch || !isVisible) return;

    const cached = getCachedMunicipalityWikiData(municipalityId, municipalityName, departmentName);
    if (cached !== undefined) {
      setWikiData(cached);
      setIsFetchingWiki(false);
      return;
    }

    let cancelled = false;
    setIsFetchingWiki(true);

    void fetchMunicipalityWikipediaData({
      municipalityId,
      municipalityName,
      departmentName
    }).then((result) => {
      if (cancelled) return;
      setWikiData(result);
      setIsFetchingWiki(false);
    });

    return () => {
      cancelled = true;
    };
  }, [needsWikiFetch, isVisible, municipalityId, municipalityName, departmentName]);

  const candidateUrl = directUserUrl || wikiData.imageUrl;
  const imageUrl = candidateUrl && candidateUrl !== failedUrl ? candidateUrl : null;
  const fallbackDescription = `Municipio de ${departmentName}.`;
  const description = validCuratedDesc || wikiData.extract || fallbackDescription;

  return {
    ref,
    imageUrl,
    description,
    isLoading: !directUserUrl && isFetchingWiki,
    isDescriptionLoading: !validCuratedDesc && isFetchingWiki,
    onImageError: () => {
      if (candidateUrl) {
        setFailedUrl(candidateUrl);
      }
    }
  };
}
