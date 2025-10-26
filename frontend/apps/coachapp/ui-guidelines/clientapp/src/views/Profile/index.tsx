import PagePaper from "@/shared/container/PagePaper";
import ProfileContent from "./ProfileContent";
import PaddingContainer from "@/shared/container/PaddingContainer";

const ProfilePage = () => {
  return (
    <PagePaper>
      <PaddingContainer>
        <ProfileContent />
      </PaddingContainer>
    </PagePaper>
  );
};

export default ProfilePage;
